import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Chessboard } from "react-chessboard";

const BRAND = "#14F195";
const CAPTURE = "#ff5470";
const FILES = "abcdefgh";
const SELECTED_LAYER = "linear-gradient(rgba(20, 241, 149, 0.32), rgba(20, 241, 149, 0.32))";
const HOVER_LAYER = "linear-gradient(rgba(20, 241, 149, 0.16), rgba(20, 241, 149, 0.16))";
const HOVER_PIECE_LAYER = "linear-gradient(rgba(20, 241, 149, 0.26), rgba(20, 241, 149, 0.26))";

function occupiedFromFen(fen: string): Set<string> {
  const out = new Set<string>();
  const rows = fen.split(" ")[0].split("/");

  for (let r = 0; r < 8; r++) {
    const rank = 8 - r;
    let file = 0;

    for (const ch of rows[r]) {
      if (/\d/.test(ch)) {
        file += parseInt(ch, 10);
      } else {
        out.add(FILES[file] + rank);
        file++;
      }
    }
  }

  return out;
}

export function Board2D({
  fen,
  orientation = "white",
  onSquareClick,
  onPieceHover,
  selectedSquare = null,
  legalMoves = [],
  interactive = true,
}: {
  fen: string;
  orientation?: "white" | "black";
  onSquareClick?: (sq: string) => void;
  onPieceHover?: (sq: string) => void;
  selectedSquare?: string | null;
  legalMoves?: string[];
  interactive?: boolean;
}) {
  const [hoveredSquare, setHoveredSquare] = useState<string | null>(null);
  const occupied = useMemo(() => occupiedFromFen(fen), [fen]);
  const legalSet = useMemo(() => new Set(legalMoves), [legalMoves]);

  useEffect(() => {
    if (!interactive) {
      setHoveredSquare(null);
    }
  }, [interactive]);

  const squareStyles = useMemo(() => {
    const styles: Record<string, CSSProperties> = {};
    const highlighted = new Set<string>([
      ...legalMoves,
      ...(selectedSquare ? [selectedSquare] : []),
      ...(hoveredSquare ? [hoveredSquare] : []),
    ]);

    for (const sq of highlighted) {
      const layers: string[] = [];
      const isHover = interactive && hoveredSquare === sq;
      const isSelected = selectedSquare === sq;
      const isLegal = legalSet.has(sq);
      const hasPiece = occupied.has(sq);

      if (isHover) {
        layers.push(hasPiece ? HOVER_PIECE_LAYER : HOVER_LAYER);
      }
      if (isSelected) {
        layers.push(SELECTED_LAYER);
      }
      if (isLegal && hasPiece) {
        layers.push(
          `radial-gradient(circle, transparent 54%, ${CAPTURE}cc 56%, ${CAPTURE}cc 66%, transparent 68%)`
        );
      }
      if (isLegal && !hasPiece) {
        layers.push(`radial-gradient(circle, ${BRAND}cc 22%, transparent 24%)`);
      }

      styles[sq] = {
        background: layers.join(", "),
        boxShadow: isSelected
          ? `inset 0 0 0 3px ${BRAND}`
          : isHover
            ? `inset 0 0 0 2px ${BRAND}99`
            : undefined,
        cursor: interactive ? "pointer" : "default",
        transition: "background 120ms ease, box-shadow 120ms ease",
      };
    }

    return styles;
  }, [hoveredSquare, interactive, legalMoves, legalSet, occupied, selectedSquare]);

  const options = useMemo(
    () => ({
      position: fen,
      boardOrientation: orientation,
      allowDragging: false,
      showNotation: true,
      squareStyles,
      darkSquareStyle: { backgroundColor: "#1f6e57" },
      lightSquareStyle: { backgroundColor: "#e7ddc6" },
      boardStyle: {
        borderRadius: "0.5rem",
        boxShadow: "0 10px 40px rgba(0,0,0,0.45)",
      },
      onSquareClick: ({ square }: { square: string }) => {
        if (!interactive) return;
        onSquareClick?.(square);
      },
      onPieceClick: ({ square }: { square: string | null }) => {
        if (!square) return;
        if (!interactive) return;
        onSquareClick?.(square);
      },
      onMouseOverSquare: ({ square }: { square: string }) => {
        if (!interactive) return;
        setHoveredSquare(square);
        if (occupied.has(square)) onPieceHover?.(square);
      },
      onMouseOutSquare: ({ square }: { square: string }) => {
        setHoveredSquare((current) => (current === square ? null : current));
      },
    }),
    [fen, interactive, occupied, onPieceHover, onSquareClick, orientation, squareStyles]
  );

  return (
    <div className="w-full h-full p-2 bg-[#0a0a0f] rounded-xl flex items-center justify-center">
      <div className="w-full">
        <Chessboard options={options} />
      </div>
    </div>
  );
}
