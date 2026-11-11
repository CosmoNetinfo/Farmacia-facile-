param(
    [string]$Csv = (Join-Path $PSScriptRoot 'farmacie-originale.csv'),
    [datetime]$Data = [datetime]'2026-11-10',
    [string]$Output = (Join-Path $PSScriptRoot 'docs/farmacie.js')
)

$ErrorActionPreference = 'Stop'
$italian = [cultureinfo]::GetCultureInfo('it-IT')
$latin = [Text.Encoding]::GetEncoding(28591, [Text.EncoderExceptionFallback]::new(), [Text.DecoderExceptionFallback]::new())
$utf8 = [Text.UTF8Encoding]::new($false, $true)
$snapshot = $Data.ToString('yyyy-MM-dd')
$cities = [ordered]@{}
$active = @{}

function Format-Field([string]$Value) {
    if ($Value -match '[\u00C2\u00C3][\u0080-\u00BF]') {
        try { $Value = $utf8.GetString($latin.GetBytes($Value)) }
        catch [Text.EncoderFallbackException], [Text.DecoderFallbackException] { }
    }
    return [Net.WebUtility]::HtmlDecode($Value).Trim()
}

foreach ($row in (Import-Csv -LiteralPath $Csv -Delimiter ';' -Encoding utf8)) {
    if (!$row.cod_farmacia -or !$row.cod_comune -or !$row.comune -or !$row.descrizione_farmacia) { continue }
    $from = [datetime]::ParseExact($row.data_inizio_validita, 'dd/MM/yyyy', $italian)
    if ($from -gt $Data.Date) { continue }
    if ($row.data_fine_validita -and $row.data_fine_validita -ne '-') {
        $to = [datetime]::ParseExact($row.data_fine_validita, 'dd/MM/yyyy', $italian)
        if ($to -lt $Data.Date) { continue }
    }
    $key = $row.cod_farmacia
    if ($active.ContainsKey($key) -and $active[$key].From -ge $from) { continue }
    $active[$key] = @{ From = $from; Row = $row }
}

foreach ($entry in ($active.Values | Sort-Object { [int]$_.Row.cod_farmacia })) {
    $row = $entry.Row
    $code = $row.cod_comune
    if (!$cities.Contains($code)) {
        $cities[$code] = @((Format-Field $row.comune), $row.sigla_provincia, (Format-Field $row.regione), [System.Collections.Generic.List[object]]::new(), $code)
    }
    $latitude = 0.0
    $longitude = 0.0
    $hasLatitude = [double]::TryParse($row.latitudine, [Globalization.NumberStyles]::Float, $italian, [ref]$latitude)
    $hasLongitude = [double]::TryParse($row.longitudine, [Globalization.NumberStyles]::Float, $italian, [ref]$longitude)
    $coordinates = $null
    if ($hasLatitude -and $hasLongitude -and $latitude -ge 35 -and $latitude -le 48 -and $longitude -ge 6 -and $longitude -le 19) {
        $coordinates = @([math]::Round($latitude, 6), [math]::Round($longitude, 6))
    }
    $cities[$code][3].Add(@(
        [int]$row.cod_farmacia, (Format-Field $row.descrizione_farmacia), (Format-Field $row.indirizzo), $row.cap,
        $coordinates, $row.descrizione_tipologia, (Format-Field $row.frazione)
    ))
}

$json = [ordered]@{ date = $snapshot; cities = @($cities.Values) } | ConvertTo-Json -Depth 9 -Compress
[IO.File]::WriteAllText($Output, "window.farmacie = $json;", $utf8)
Write-Output "$($active.Count) farmacie in $($cities.Count) comuni."
