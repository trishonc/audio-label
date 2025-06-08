interface PlayerProps {
  file: File | null;
  url: string | null;
  videoRef: (element: HTMLVideoElement | null) => void;
}

export default function Player({ file, url, videoRef }: PlayerProps) {
  if (!file || !url) {
    return <div>No media selected…</div>;
  }

  return file.type.startsWith("video") ? (
    <video 
      ref={videoRef}
      key={url} 
      src={url} 
      className="w-full h-full object-contain rounded shadow" 
    />
  ) : (
    <audio key={url} src={url} className="w-full" />
  );
}
