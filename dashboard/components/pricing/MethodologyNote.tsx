/**
 * Aviso de metodologia — deixa explícito que "margem" nesta seção não é
 * margem contábil (não há coluna de custo no banco). É sempre uma leitura
 * relativa: desconto entre preço de tabela e preço praticado, e
 * posicionamento frente ao preço coletado da concorrência.
 */
export function MethodologyNote() {
  return (
    <p className="text-sm text-text-secondary">
      <span className="font-semibold text-text-secondary">Nota de metodologia: </span>
      não há coluna de custo/margem contábil no banco de dados. &ldquo;Desconto&rdquo; e
      &ldquo;posição vs. concorrência&rdquo; nesta página são leituras{" "}
      <span className="font-medium">relativas/percebidas</span>: a diferença
      entre o preço de tabela (<code className="text-xs">produtos.preco_atual</code>)
      e o preço efetivamente praticado nas vendas (
      <code className="text-xs">vendas.preco_unitario</code>), e a diferença
      frente ao preço coletado de concorrentes (
      <code className="text-xs">preco_competidores.preco_concorrente</code>).
      Os 20 produtos placeholder (&ldquo;Produto Descontinuado&rdquo;, oriundos de vendas
      órfãs sem cadastro de produto) são excluídos de todas as comparações
      abaixo, pois não têm concorrência real associada.
    </p>
  );
}
