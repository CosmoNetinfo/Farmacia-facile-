(() => {
  function normalize(text = "") {
    return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  }

  function addressKey(street, number) {
    const road = normalize(street || "")
      .replace(/^v le /, "viale ").replace(/^p z{1,2}a /, "piazza ")
      .replace(/^c so /, "corso ").replace(/^l go /, "largo ")
      .replace(/^via (?:via |strada )/, match => match.slice(4));
    const civic = String(number || "").trim().toLowerCase()
      .replace(/^n(?:[.°º]|\s)+/, "").replace(/\s+/g, "").replace(/\/(?=[a-z]$)/, "");
    return road && /^\d+(?:[a-z]|[/-]\d+[a-z]?)?$/.test(civic) ? road + "|" + civic : "";
  }

  function fullAddressKey(value = "") {
    const address = value.trim().replace(/\s+-\s+[^0-9]+$/, "");
    const parts = address.match(/^(.*?)[,\s]+(?:n(?:[.°º]|\s)+)?(\d+(?:\s*(?:[/-]\s*\d+\s*[a-z]?|\/?\s*[a-z]))?)$/i);
    return parts ? addressKey(parts[1], parts[2]) : "";
  }

  globalThis.pharmacyAddress = { normalize, addressKey, fullAddressKey };
})();
