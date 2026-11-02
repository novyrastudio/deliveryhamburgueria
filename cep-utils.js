(function attachFornalhaCep(root, createApi) {
  const api = createApi();
  if (root) root.FornalhaCep = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis, function createFornalhaCep() {
  function digitsOnly(value) {
    return String(value || "").replace(/\D/g, "");
  }

  function formatCep(value) {
    const digits = digitsOnly(value).slice(0, 8);
    return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
  }

  function addressForOrder(fulfillment = {}) {
    const parts = [
      String(fulfillment.address || "").trim(),
      String(fulfillment.neighborhood || "").trim(),
      [String(fulfillment.city || "").trim(), String(fulfillment.uf || "").trim()].filter(Boolean).join("/"),
      digitsOnly(fulfillment.cep).length === 8 ? `CEP ${formatCep(fulfillment.cep)}` : "",
    ].filter(Boolean);
    return parts.join(" • ").slice(0, 200);
  }

  function deliveryAreasForCep(cep, coverageByArea = {}) {
    const digits = digitsOnly(cep);
    const number = Number(digits);
    if (!Number.isFinite(number) || digits.length !== 8) return [];
    return Object.entries(coverageByArea)
      .filter(([, coverage]) => {
        const ranges = String(coverage || "").match(/\d{5}-?\d{3}/g) || [];
        if (ranges.length < 2) return false;
        const start = Number(digitsOnly(ranges[0]));
        const end = Number(digitsOnly(ranges[1]));
        return number >= Math.min(start, end) && number <= Math.max(start, end);
      })
      .map(([name]) => name);
  }

  return Object.freeze({ digitsOnly, formatCep, addressForOrder, deliveryAreasForCep });
});
