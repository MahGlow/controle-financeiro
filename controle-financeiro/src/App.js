import React, { useState } from "react";

function ControleFinanceiro() {
  const [saldo, setSaldo] = useState(0);
  const [valor, setValor] = useState("");

  const handleEntrada = () => {
    const entrada = parseFloat(valor);
    if (!isNaN(entrada)) {
      setSaldo((prev) => prev + entrada);
      setValor("");
    }
  };

  const handleSaida = () => {
    const saida = parseFloat(valor);
    if (!isNaN(saida)) {
      setSaldo((prev) => prev - saida);
      setValor("");
    }
  };

  return (
    <div style={{ padding: 40, fontFamily: "Arial" }}>
      <h2>💰 Controle Financeiro</h2>
      <h3>Saldo atual: R$ {saldo.toFixed(2)}</h3>
      <input
        type="number"
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        placeholder="Digite um valor"
      />
      <br />
      <button onClick={handleEntrada} style={{ marginRight: 10 }}>
        + Entrada
      </button>
      <button onClick={handleSaida}>- Saída</button>
    </div>
  );
}

export default ControleFinanceiro;
