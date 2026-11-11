[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$invariant = [Globalization.CultureInfo]::InvariantCulture
$docs = Join-Path $PSScriptRoot 'docs'
$temporary = [IO.Directory]::CreateTempSubdirectory('farmacia-vicino-').FullName
$python = if ($IsWindows) { 'py' } else { 'python3' }
$curl = if ($IsWindows) { 'curl.exe' } else { 'curl' }

function Read-Data([string]$Path, [string]$Variable) {
    $contents = Get-Content -Raw -LiteralPath $Path -Encoding utf8
    $prefix = "window.$Variable = "
    $offset = $contents.IndexOf($prefix, [StringComparison]::Ordinal)
    if ($offset -lt 0) { throw "Formato dati inatteso: $Path" }
    return $contents.Substring($offset + $prefix.Length).Trim().TrimEnd(';') | ConvertFrom-Json -AsHashtable
}

function Get-RegistryKeys($Registry) {
    $keys = @{}
    foreach ($town in $Registry.cities) {
        foreach ($pharmacy in $town[3]) {
            $keys[[string]$pharmacy[0]] = [string]::Join('|', [string[]]@($town[0], $pharmacy[1], $pharmacy[2], $pharmacy[3]))
        }
    }
    return $keys
}

function Save-Source([string]$Url, [string]$Path) {
    & $curl --fail --silent --show-error --location --retry 2 --max-time 45 --proto '=https' --proto-redir '=https' --output $Path $Url
    if ($LASTEXITCODE -ne 0) { throw "Download non riuscito: $Url" }
}

try {
    $current = Read-Data (Join-Path $docs 'farmacie.js') 'farmacie'
    $ministryHost = 'https://www.dati.salute.gov.it'
    $catalog = Join-Path $temporary 'catalogo.html'
    Save-Source "$ministryHost/it/dataset/farmacie/" $catalog
    $files = [regex]::Matches((Get-Content -Raw -LiteralPath $catalog), 'FRM_FARMA_5_(?<day>\d{8})\.csv')
    $latest = $files | Sort-Object Value -Descending | Select-Object -First 1
    if (!$latest) { throw 'Il catalogo ministeriale non contiene un collegamento CSV riconosciuto.' }
    $snapshot = [datetime]::ParseExact($latest.Groups['day'].Value, 'yyyyMMdd', $invariant)
    if ($snapshot -lt [datetime]::ParseExact($current.date, 'yyyy-MM-dd', $invariant)) {
        throw 'Il catalogo del Ministero indica una versione precedente a quella pubblicata.'
    }

    $ministryCsv = Join-Path $temporary $latest.Value
    Save-Source "$ministryHost/sites/default/files/opendata/$($latest.Value)" $ministryCsv
    $nextPharmacies = Join-Path $temporary 'farmacie.js'
    & (Join-Path $PSScriptRoot 'importa-farmacie.ps1') -Csv $ministryCsv -Data $snapshot -Output $nextPharmacies
    $next = Read-Data $nextPharmacies 'farmacie'
    $regions = @($next.cities | ForEach-Object { $_[2] } | Sort-Object -Unique)
    if ($regions.Count -lt 20 -or $next.date -ne $snapshot.ToString('yyyy-MM-dd', $invariant)) {
        throw "L’estrazione ministeriale non copre il territorio nazionale o ha una data incoerente."
    }

    $day = [uri]::EscapeDataString([datetime]::UtcNow.ToString('dd/MM/yyyy', $invariant))
    $situas = 'https://situas-servizi.istat.it/publish/reportspooljson'
    $municipalities = Join-Path $temporary 'comuni.json'
    $suppressions = Join-Path $temporary 'soppressi.json'
    $sardinia = Join-Path $temporary 'sardegna.zip'
    Save-Source "$($situas)?pfun=61&pdata=$day" $municipalities
    Save-Source "$($situas)?pfun=128&pdata=$day" $suppressions
    Save-Source 'https://www.istat.it/wp-content/uploads/2024/09/Codici-statistici-e-denominazioni-delle-unita-amministrative-della-Sardegna.zip' $sardinia
    $nextTowns = Join-Path $temporary 'comuni.js'
    & $python (Join-Path $PSScriptRoot 'importa-comuni.py') $municipalities $suppressions $sardinia --output $nextTowns
    if ($LASTEXITCODE -ne 0) { throw 'Importazione ISTAT non riuscita.' }

    $contactPath = Join-Path $docs 'recapiti-osm.js'
    $contacts = Read-Data $contactPath 'recapitiOSM'
    $previousKeys = Get-RegistryKeys $current
    $nextKeys = Get-RegistryKeys $next
    $removed = 0
    foreach ($id in @($contacts.records.Keys)) {
        if (!$nextKeys.ContainsKey($id) -or $nextKeys[$id] -cne $previousKeys[$id]) {
            [void]$contacts.records.Remove($id)
            $removed++
        }
    }
    $outputs = @($nextPharmacies, $nextTowns)
    if ($removed) {
        $nextContacts = Join-Path $temporary 'recapiti-osm.js'
        $header = Get-Content -LiteralPath $contactPath -TotalCount 1 -Encoding utf8
        $json = ConvertTo-Json -InputObject $contacts -Depth 6 -Compress
        $lf = [char]10
        [IO.File]::WriteAllText($nextContacts, "$header$($lf)window.recapitiOSM = $json;$lf")
        $outputs += $nextContacts
    }

    Copy-Item -LiteralPath $outputs -Destination $docs
    Write-Output "Ministero $($next.date), ISTAT $([uri]::UnescapeDataString($day)). Recapiti da ricontrollare: $removed."
}
finally {
    Get-ChildItem -LiteralPath $temporary -File | Remove-Item
    Remove-Item -LiteralPath $temporary
}
