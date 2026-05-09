import { ReactNode, useEffect } from "react";

export function Modal({ isOpen, onClose, title, children, centered = false }: { isOpen: boolean, onClose: () => void, title: string, children: ReactNode, centered?: boolean }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      const handler = () => {
        if (window.visualViewport) {
          const modal = document.getElementById('modal-container');
          if (modal) {
            modal.style.height = `${window.visualViewport.height}px`;
            modal.style.top = `${window.visualViewport.offsetTop}px`;
          }
        }
      };

      // 入力フィールドにフォーカスした際に中央へスクロール
      const handleFocusIn = (e: FocusEvent) => {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
          // キーボードのせり上がりを待ってから中央へスクロール
          setTimeout(() => {
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 300);
        }
      };

      window.visualViewport?.addEventListener('resize', handler);
      window.addEventListener('focusin', handleFocusIn);

      return () => {
        document.body.style.overflow = "";
        window.visualViewport?.removeEventListener('resize', handler);
        window.removeEventListener('focusin', handleFocusIn);
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;
  return (
    <div 
      className={`fixed inset-0 bg-black/50 backdrop-blur-sm flex ${centered ? 'items-center' : 'items-end'} justify-center z-50 touch-none`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        id="modal-container" 
        className={`flex flex-col bg-white/90 backdrop-blur-lg ${centered ? 'rounded-3xl' : 'rounded-t-3xl'} shadow-2xl border border-white/50 w-full max-w-md max-h-[85dvh] overflow-hidden overscroll-contain fixed`}
        style={{ bottom: 0 }}
      >
        <div className="flex justify-between items-center p-6 shrink-0">
          <h2 className="text-xl font-bold text-gray-800">{title}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800">閉じる</button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 pb-[calc(4rem+env(safe-area-inset-bottom,24px))]">
          {children}
        </div>
      </div>
    </div>
  );
}
