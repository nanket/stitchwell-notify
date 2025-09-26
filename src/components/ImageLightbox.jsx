import React, { useEffect } from 'react';

const ImageLightbox = ({ images = [], index = 0, onClose }) => {
  const [i, setI] = React.useState(index);
  const list = images.map((im) => (typeof im === 'string' ? { fullUrl: im } : im));
  const curr = list[i] || {};

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
      if (e.key === 'ArrowRight') setI((v) => (v + 1) % Math.max(1, list.length));
      if (e.key === 'ArrowLeft') setI((v) => (v - 1 + Math.max(1, list.length)) % Math.max(1, list.length));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [list.length, onClose]);

  if (!list.length) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center" role="dialog" aria-modal="true">
      <button aria-label="Close" className="absolute top-3 right-3 text-white text-2xl" onClick={onClose}>×</button>
      <div className="relative w-full max-w-3xl px-4">
        <img src={curr.fullUrl} alt="full" className="max-h-[80vh] w-full object-contain rounded" />
        {list.length > 1 && (
          <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between px-2">
            <button aria-label="Prev" className="text-white text-2xl px-3" onClick={() => setI((v) => (v - 1 + list.length) % list.length)}>‹</button>
            <button aria-label="Next" className="text-white text-2xl px-3" onClick={() => setI((v) => (v + 1) % list.length)}>›</button>
          </div>
        )}
        <div className="mt-3 text-center text-white text-sm">{i + 1} / {list.length}</div>
      </div>
    </div>
  );
};

export default ImageLightbox;

