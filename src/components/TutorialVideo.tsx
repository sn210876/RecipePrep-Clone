interface TutorialVideoProps {
  src: string;
  title?: string;
  className?: string;
  width?: string; // Add this
}

export function TutorialVideo({ src, title, className = '', width = '100%' }: TutorialVideoProps) {
  return (
    <div className={`mx-auto ${className}`} style={{ width }}>
      <div className="rounded-lg overflow-hidden shadow-md bg-black">
        {title && (
          <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-4 py-2">
            <p className="text-white font-medium text-sm">{title}</p>
          </div>
        )}
        <video
          controls
          controlsList="nodownload"
          className="w-full"
          preload="metadata"
        >
          <source src={src} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      </div>
    </div>
  );
}