import { useState, useMemo, useEffect, useRef } from "react";
import { useLocation } from "@tanstack/react-router";
import {
  X,
  Search,
  HelpCircle,
  Compass,
  ArrowLeft,
  ChevronRight,
  BookOpen,
  CheckCircle2,
  Sparkles,
  Info,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { JansolSunIcon } from "./JansolLogo";
import {
  TODOS_ARTIGOS,
  PERGUNTAS_FREQUENTES,
  CATEGORIAS_AJUDA,
  getArtigoPorRota,
  type ArtigoAjuda,
} from "@/lib/jansol-assistente-data";

export function JansolAssistenteDrawer({
  open,
  onOpenChange,
  triggerRef,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  triggerRef?: React.RefObject<HTMLButtonElement | null>;
}) {
  const location = useLocation();
  const [busca, setBusca] = useState("");
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<string | null>(null);
  const [artigoAtivo, setArtigoAtivo] = useState<ArtigoAjuda | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Foco no campo de busca ao abrir o drawer
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    } else if (triggerRef?.current) {
      // Devolver o foco ao botão flutuante ao fechar
      setTimeout(() => {
        triggerRef.current?.focus();
      }, 50);
    }
  }, [open, triggerRef]);

  // Artigo Contextual da Rota Atual
  const artigoContextual = useMemo(() => {
    return getArtigoPorRota(location.pathname);
  }, [location.pathname]);

  // Filtragem Local de Artigos por Busca e Categoria
  const resultadosBusca = useMemo(() => {
    const q = busca.toLowerCase().trim();
    return TODOS_ARTIGOS.filter((artigo) => {
      const matchCategoria = !categoriaSelecionada || artigo.categoria === categoriaSelecionada;
      if (!matchCategoria) return false;
      if (!q) return true;

      const inTitulo = artigo.titulo.toLowerCase().includes(q);
      const inResumo = artigo.resumo.toLowerCase().includes(q);
      const inKw = artigo.palavrasChave.some((kw) => kw.toLowerCase().includes(q));
      const inConteudo = artigo.conteudo.some((c) => c.toLowerCase().includes(q));

      return inTitulo || inResumo || inKw || inConteudo;
    });
  }, [busca, categoriaSelecionada]);

  const handleAbrirArtigo = (artigo: ArtigoAjuda) => {
    setArtigoAtivo(artigo);
  };

  const handleVoltar = () => {
    setArtigoAtivo(null);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md max-w-[440px] bg-[#F8F6F1] p-0 text-[#24231F] border-l border-[#E2DDD0] flex flex-col justify-between shadow-2xl">
        {/* Cabeçalho do JANSOL Assistente */}
        <div className="p-5 border-b border-[#E2DDD0] bg-white space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1D1C19] text-[#E3B94F]">
                <JansolSunIcon className="h-4 w-4" />
              </div>
              <div>
                <SheetTitle className="text-base font-bold text-[#24231F] flex items-center gap-2">
                  JANSOL Assistente
                </SheetTitle>
                <span className="text-[10px] font-semibold text-[#8E8C82] uppercase tracking-wider">
                  Central de Ajuda Inteligente
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 rounded-lg border border-[#E2DDD0] bg-[#F8F6F1] flex items-center justify-center text-[#706D65] hover:text-[#1D1C19] hover:bg-[#FAF5E8] transition-colors"
              aria-label="Fechar assistente (Esc)"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <SheetDescription className="text-xs text-[#706D65] font-medium">
            Como posso ajudar você a usar o sistema?
          </SheetDescription>

          {/* Campo de Pesquisa Local */}
          <div className="relative mt-2">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#8E8C82]" />
            <input
              ref={searchInputRef}
              type="text"
              value={busca}
              onChange={(e) => {
                setBusca(e.target.value);
                setArtigoAtivo(null);
              }}
              placeholder="Pesquise uma dúvida ou funcionalidade..."
              className="w-full rounded-full border border-[#E2DDD0] bg-[#F2EFE8] py-2 pl-9 pr-4 text-xs font-medium text-[#24231F] placeholder-[#8E8C82] focus:border-[#E3B94F] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E3B94F]/20 transition-all"
            />
            {busca && (
              <button
                type="button"
                onClick={() => setBusca("")}
                className="absolute right-3 top-2.5 text-xs text-[#8E8C82] hover:text-[#24231F]"
              >
                Limpar
              </button>
            )}
          </div>
        </div>

        {/* Conteúdo Principal Flexível com Scroll */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* VISUALIZAÇÃO DE ARTIGO SELECIONADO */}
          {artigoAtivo ? (
            <div className="space-y-4 animate-fadeIn">
              <button
                type="button"
                onClick={handleVoltar}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1D1C19] hover:text-[#C8794A] transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Voltar à busca</span>
              </button>

              <div className="jansol-bento-card p-4 bg-white space-y-3">
                <span className="inline-block rounded-full bg-[#FAF5E8] px-2.5 py-0.5 text-[10px] font-bold text-[#C8794A] border border-[#E2DDD0]">
                  {artigoAtivo.categoria}
                </span>

                <h3 className="text-base font-bold text-[#24231F]">
                  {artigoAtivo.titulo}
                </h3>

                <p className="text-xs text-[#706D65] leading-relaxed">
                  {artigoAtivo.resumo}
                </p>

                <div className="pt-2 border-t border-[#E2DDD0]/60 space-y-2">
                  {artigoAtivo.conteudo.map((paragrafo, idx) => (
                    <p key={idx} className="text-xs text-[#24231F] leading-relaxed">
                      {paragrafo}
                    </p>
                  ))}
                </div>

                {artigoAtivo.passos && artigoAtivo.passos.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-[#E2DDD0]/60 space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#706D65]">
                      Passo a Passo Prático:
                    </h4>
                    <ol className="space-y-2">
                      {artigoAtivo.passos.map((passo, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-[#24231F]">
                          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#1D1C19] text-[10px] font-bold text-[#F8F6F1] mt-0.5">
                            {idx + 1}
                          </span>
                          <span>{passo}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* BOTÃO CONTEXTUAL DE ACORDO COM A ROTA ATUAL */}
              {!busca && !categoriaSelecionada && (
                <div className="jansol-bento-card p-4 bg-white space-y-2 border-l-4 border-l-[#E3B94F]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#24231F]">
                      <Compass className="h-4 w-4 text-[#C8794A]" />
                      <span>Ajuda Contextual da Rota</span>
                    </div>
                    <span className="text-[10px] font-semibold text-[#8E8C82] truncate max-w-[120px]">
                      {location.pathname}
                    </span>
                  </div>

                  <p className="text-xs font-semibold text-[#1D1C19]">
                    {artigoContextual.titulo}
                  </p>
                  <p className="text-[11px] text-[#706D65] line-clamp-2">
                    {artigoContextual.resumo}
                  </p>

                  <button
                    type="button"
                    onClick={() => handleAbrirArtigo(artigoContextual)}
                    className="mt-1 inline-flex items-center gap-1.5 rounded-md bg-[#1D1C19] px-3 py-1.5 text-xs font-bold text-[#F8F6F1] hover:bg-[#292722] transition-colors w-full justify-center"
                  >
                    <span>Como usar esta página?</span>
                    <ChevronRight className="h-3.5 w-3.5 text-[#E3B94F]" />
                  </button>
                </div>
              )}

              {/* PERGUNTAS FREQUENTES */}
              {!busca && !categoriaSelecionada && (
                <div className="space-y-3">
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#706D65] flex items-center gap-1.5">
                    <HelpCircle className="h-3.5 w-3.5 text-[#E3B94F]" />
                    <span>Perguntas Frequentes</span>
                  </h3>

                  <div className="jansol-bento-card bg-white overflow-hidden divide-y divide-[#E2DDD0]/60">
                    {PERGUNTAS_FREQUENTES.map((faq) => (
                      <button
                        key={faq.id}
                        type="button"
                        onClick={() => handleAbrirArtigo(faq)}
                        className="w-full p-3 text-left hover:bg-[#FAF5E8]/60 transition-colors flex items-center justify-between gap-3 group"
                      >
                        <span className="text-xs font-bold text-[#24231F] group-hover:text-[#C8794A]">
                          {faq.titulo}
                        </span>
                        <ChevronRight className="h-3.5 w-3.5 text-[#8E8C82] shrink-0 group-hover:text-[#C8794A]" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* RESULTADOS DA BUSCA (SE HOUVER DIGITAÇÃO OU FILTRO) */}
              {(busca || categoriaSelecionada) && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#706D65]">
                      Resultados Encontrados ({resultadosBusca.length})
                    </h3>
                    {categoriaSelecionada && (
                      <button
                        type="button"
                        onClick={() => setCategoriaSelecionada(null)}
                        className="text-[11px] font-bold text-[#C8794A] hover:underline"
                      >
                        Limpar filtro
                      </button>
                    )}
                  </div>

                  {resultadosBusca.length === 0 ? (
                    <div className="p-6 text-center text-xs text-[#706D65] jansol-bento-card bg-white">
                      Nenhum artigo encontrado para "{busca}". Tente outros termos.
                    </div>
                  ) : (
                    <div className="jansol-bento-card bg-white overflow-hidden divide-y divide-[#E2DDD0]/60">
                      {resultadosBusca.map((artigo) => (
                        <button
                          key={artigo.id}
                          type="button"
                          onClick={() => handleAbrirArtigo(artigo)}
                          className="w-full p-3 text-left hover:bg-[#FAF5E8]/60 transition-colors flex items-start justify-between gap-3 group"
                        >
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold text-[#C8794A]">
                              {artigo.categoria}
                            </span>
                            <p className="text-xs font-bold text-[#24231F] group-hover:text-[#C8794A]">
                              {artigo.titulo}
                            </p>
                            <p className="text-[11px] text-[#706D65] line-clamp-1">
                              {artigo.resumo}
                            </p>
                          </div>
                          <ChevronRight className="h-3.5 w-3.5 text-[#8E8C82] shrink-0 mt-1" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* NAVEGAÇÃO POR CATEGORIAS */}
              {!busca && (
                <div className="space-y-3">
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#706D65]">
                    Explorar por Categoria
                  </h3>

                  <div className="grid grid-cols-2 gap-2">
                    {CATEGORIAS_AJUDA.map((cat) => {
                      const active = categoriaSelecionada === cat;
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() =>
                            setCategoriaSelecionada((prev) => (prev === cat ? null : cat))
                          }
                          className={`flex items-center justify-between rounded-lg border p-2.5 text-left text-xs font-medium transition-all ${
                            active
                              ? "border-[#E3B94F] bg-[#1D1C19] text-[#F8F6F1] font-bold"
                              : "border-[#E2DDD0] bg-white text-[#24231F] hover:bg-[#FAF5E8]"
                          }`}
                        >
                          <span className="truncate">{cat}</span>
                          <BookOpen className={`h-3.5 w-3.5 shrink-0 ${active ? "text-[#E3B94F]" : "text-[#8E8C82]"}`} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Rodapé Informativo (Preparação para IA sem chamadas externas) */}
        <div className="p-4 border-t border-[#E2DDD0] bg-white space-y-1 text-center">
          <div className="flex items-center justify-center gap-1.5 text-[11px] font-semibold text-[#706D65]">
            <Info className="h-3.5 w-3.5 text-[#E3B94F]" />
            <span>Central de Ajuda Inteligente Local</span>
          </div>
          <p className="text-[10px] text-[#8E8C82]">
            Atalhos: Use <kbd className="font-bold text-[#1D1C19]">Cmd/Ctrl + J</kbd> para abrir ou <kbd className="font-bold text-[#1D1C19]">Esc</kbd> para fechar.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
