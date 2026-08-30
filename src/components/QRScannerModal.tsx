import React, { useEffect, useRef, useState, useCallback } from 'react';
import jsQR from 'jsqr';
import {
  X,
  Upload,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Zap,
  QrCode,
  Info,
  HelpCircle,
  Image as ImageIcon,
  Camera,
} from 'lucide-react';
import { parseCryptoQR, type ScannedQRData } from '@/lib/qrParser';

export type { ScannedQRData };

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (data: ScannedQRData) => void;
  title?: string;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
  title = 'Scan Recipient QR Code',
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const lastScanTimeRef = useRef<number>(0);
  const isScanningRef = useRef<boolean>(false);

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isPermissionDenied, setIsPermissionDenied] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [scannedResult, setScannedResult] = useState<ScannedQRData | null>(null);
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  // Stop camera tracks cleanly
  const stopCameraTracks = useCallback(() => {
    isScanningRef.current = false;
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setTorchOn(false);
  }, []);

  // Continuous frame analysis with throttling to eliminate glitching & jumping
  const scanLoop = useCallback(() => {
    if (!isScanningRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video && canvas && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      const now = performance.now();
      // Scan every ~90ms (approx 11 fps) to keep video silky smooth and free CPU
      if (now - lastScanTimeRef.current >= 90) {
        lastScanTimeRef.current = now;

        const videoW = video.videoWidth;
        const videoH = video.videoHeight;

        if (videoW > 0 && videoH > 0) {
          // Only resize canvas if dimensions actually changed
          if (canvas.width !== videoW || canvas.height !== videoH) {
            canvas.width = videoW;
            canvas.height = videoH;
          }

          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (ctx) {
            ctx.drawImage(video, 0, 0, videoW, videoH);
            const imageData = ctx.getImageData(0, 0, videoW, videoH);

            try {
              const code = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: 'dontInvert',
              });

              if (code && code.data && isScanningRef.current) {
                const parsed = parseCryptoQR(code.data);
                if (parsed && parsed.address) {
                  isScanningRef.current = false;
                  setScannedResult(parsed);
                  stopCameraTracks();

                  // Haptic vibration feedback
                  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
                    try {
                      navigator.vibrate([100, 50, 100]);
                    } catch {
                      // ignore
                    }
                  }

                  setTimeout(() => {
                    onScanSuccess(parsed);
                    onClose();
                  }, 500);
                  return;
                }
              }
            } catch (err) {
              console.warn('jsQR scan parse error:', err);
            }
          }
        }
      }
    }

    if (isScanningRef.current) {
      animFrameIdRef.current = requestAnimationFrame(scanLoop);
    }
  }, [onScanSuccess, onClose, stopCameraTracks]);

  // Start camera stream safely
  const startCameraStream = useCallback(async (deviceId?: string) => {
    setCameraError(null);
    setIsPermissionDenied(false);
    setScannedResult(null);

    // Stop existing tracks first
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported by your browser environment.');
      }

      const videoConstraints: MediaTrackConstraints = deviceId
        ? { deviceId: { exact: deviceId } }
        : {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 },
          };

      const newStream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: false,
      });

      streamRef.current = newStream;

      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.muted = true;
        try {
          await videoRef.current.play();
        } catch {
          // auto-play policy might resolve
        }
      }

      isScanningRef.current = true;
      setIsCameraActive(true);

      // Check for torch capability
      const videoTrack = newStream.getVideoTracks()[0];
      if (videoTrack && videoTrack.getCapabilities) {
        const caps = videoTrack.getCapabilities() as { torch?: boolean };
        setHasTorch(Boolean(caps && caps.torch));
      }

      // Enumerate cameras
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevs = devices.filter((d) => d.kind === 'videoinput');
        setAvailableDevices(videoDevs);
        if (!deviceId && videoDevs.length > 0 && videoTrack) {
          const settings = videoTrack.getSettings();
          if (settings.deviceId) {
            setSelectedDeviceId(settings.deviceId);
          }
        }
      } catch {
        // ignore device listing error
      }

      // Kick off smooth scan loop
      animFrameIdRef.current = requestAnimationFrame(scanLoop);
    } catch (err: unknown) {
      const errorObj = err as { name?: string; message?: string };
      console.warn('Camera initialization error:', err);
      let msg = 'Unable to access camera. Please allow camera permissions or upload an image.';
      if (errorObj?.name === 'NotAllowedError' || errorObj?.name === 'PermissionDeniedError') {
        setIsPermissionDenied(true);
        msg = 'Camera permission was denied. You can enable it in your browser address bar or directly upload / drag a QR image screenshot below.';
      } else if (errorObj?.name === 'NotFoundError' || errorObj?.name === 'DevicesNotFoundError') {
        msg = 'No video camera detected on your device. You can upload a QR image or screenshot below.';
      }
      setCameraError(msg);
      setIsCameraActive(false);
      isScanningRef.current = false;
    }
  }, [scanLoop]);

  // Flashlight toggle
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track && hasTorch) {
      try {
        const nextState = !torchOn;
        await track.applyConstraints({
          advanced: [{ torch: nextState } as unknown as MediaTrackConstraintSet],
        });
        setTorchOn(nextState);
      } catch (e) {
        console.warn('Torch toggle error:', e);
      }
    }
  };

  // Lifecycle: open/close
  useEffect(() => {
    if (isOpen) {
      startCameraStream();
    } else {
      stopCameraTracks();
      setScannedResult(null);
      setCameraError(null);
      setIsPermissionDenied(false);
      setShowGuide(false);
    }
    return () => {
      stopCameraTracks();
    };
  }, [isOpen, startCameraStream, stopCameraTracks]);

  // Process static image file
  const processImageFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code && code.data) {
          const parsed = parseCryptoQR(code.data);
          if (parsed.address) {
            setScannedResult(parsed);
            stopCameraTracks();
            setTimeout(() => {
              onScanSuccess(parsed);
              onClose();
            }, 500);
          } else {
            setCameraError(`QR code found but no crypto address recognized: "${code.data.slice(0, 60)}"`);
          }
        } else {
          setCameraError('No readable QR code found in the selected image. Please try a clearer screenshot.');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      processImageFile(file);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200"
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <div className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-white">
        {/* Header */}
        <div className="px-6 py-4 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-zinc-950 border border-[#3B82F6]/40 text-[#3B82F6] flex items-center justify-center font-black">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-[#FFFFFF]">{title}</h3>
              <p className="text-xs text-zinc-400 font-medium">
                Polygon & Ethereum EIP-681 / Address
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowGuide(!showGuide)}
              className="p-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-[#FACC15] hover:text-[#FACC15]/80 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
              title="Camera Permission Guide"
            >
              <HelpCircle className="w-4 h-4 text-[#FACC15]" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900 flex items-center justify-center transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Viewfinder Video Canvas */}
        <div className="relative bg-black aspect-[4/3] w-full flex items-center justify-center overflow-hidden">
          <canvas ref={canvasRef} className="hidden" />

          {/* Video Stream Element */}
          <video
            ref={videoRef}
            className={`w-full h-full object-cover ${cameraError ? 'hidden' : 'block'}`}
            muted
            autoPlay
            playsInline
          />

          {/* Smooth, Non-glitching Optical Viewfinder */}
          {!cameraError && isCameraActive && !scannedResult && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="relative w-64 h-64 sm:w-72 sm:h-72 border border-[#3B82F6]/60 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.75)] overflow-hidden">
                {/* 4 Crisp Corner Brackets */}
                <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-[#3B82F6] rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-[#3B82F6] rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-[#3B82F6] rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-[#3B82F6] rounded-br-lg" />

                {/* Silky-smooth scanning laser beam */}
                <div
                  className="absolute left-0 right-0 h-0.5 bg-[#00E676] shadow-[0_0_12px_#00E676]"
                  style={{
                    animation: 'scanLaser 2.2s ease-in-out infinite alternate',
                  }}
                />

                <div className="absolute bottom-3 inset-x-0 text-center">
                  <span className="px-3 py-1 rounded-full bg-zinc-950/90 text-[#FACC15] text-[10px] font-black tracking-wider uppercase border border-[#FACC15]/40">
                    Align QR Inside Frame
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Drag-over overlay */}
          {isDragging && (
            <div className="absolute inset-0 bg-zinc-950/95 border-2 border-dashed border-[#3B82F6] flex flex-col items-center justify-center p-6 text-center z-10 animate-in fade-in duration-150">
              <Upload className="w-12 h-12 text-[#3B82F6] mb-2 animate-pulse" />
              <p className="text-sm font-extrabold text-[#FFFFFF]">Drop QR Code Image Here</p>
              <p className="text-xs text-[#3B82F6]">Will automatically parse address instantly</p>
            </div>
          )}

          {/* Success Overlay */}
          {scannedResult && (
            <div className="absolute inset-0 bg-zinc-950/95 flex flex-col items-center justify-center p-6 text-center animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-[#00E676]/40 text-[#00E676] flex items-center justify-center mb-3 shadow-[0_0_20px_rgba(0,230,118,0.25)]">
                <CheckCircle2 className="w-10 h-10 text-[#00E676]" />
              </div>
              <h4 className="text-lg font-black text-[#FFFFFF]">QR Code Recognized!</h4>
              <p className="text-xs text-zinc-300 mt-1 font-mono break-all max-w-xs bg-black/60 p-2.5 rounded-xl border border-zinc-800">
                {scannedResult.address}
              </p>
              {scannedResult.amount && (
                <span className="mt-2 px-3 py-1 rounded-full bg-zinc-900 border border-[#00E676]/40 text-[#00E676] text-xs font-black">
                  Amount: {scannedResult.amount} {scannedResult.tokenSymbol || ''}
                </span>
              )}
            </div>
          )}

          {/* Camera Error / Permission Screen */}
          {cameraError && (
            <div className="p-5 text-center max-w-md flex flex-col items-center justify-center w-full h-full bg-zinc-950/95 backdrop-blur">
              <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-[#EF4444]/40 text-[#EF4444] flex items-center justify-center mb-2.5 shadow-md">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-extrabold text-[#FFFFFF] mb-1">
                {isPermissionDenied ? 'Camera Access Denied' : 'Camera Notice'}
              </h4>
              <p className="text-xs text-zinc-400 mb-3 px-2 leading-relaxed">
                {cameraError}
              </p>

              {/* Upload QR Box */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-zinc-800 hover:border-[#3B82F6] bg-zinc-900 hover:bg-zinc-900/80 cursor-pointer rounded-2xl p-4 mb-3 transition flex flex-col items-center justify-center gap-1.5"
              >
                <div className="w-9 h-9 rounded-xl bg-zinc-950 border border-zinc-800 text-[#3B82F6] flex items-center justify-center">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <span className="text-xs font-black text-[#FFFFFF]">
                  Click or Drag & Drop QR Image / Screenshot
                </span>
                <span className="text-[10px] text-zinc-400 font-medium">
                  Instant decode for all PNG, JPG, or WebP QR codes
                </span>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={() => startCameraStream(selectedDeviceId)}
                  className="px-4 py-2 rounded-xl bg-[#3B82F6] text-white text-xs font-extrabold flex items-center gap-1.5 hover:bg-[#3B82F6]/90 transition shadow-[0_0_10px_rgba(59,130,246,0.3)] cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Try Camera Again</span>
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 rounded-xl bg-zinc-900 text-zinc-300 border border-zinc-800 text-xs font-extrabold flex items-center gap-1.5 hover:bg-zinc-800 transition cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Select File</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Expandable Camera Permission Guide */}
        {showGuide && (
          <div className="p-4 bg-zinc-900 border-t border-zinc-800 text-xs space-y-2 text-zinc-300 animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-1.5 text-[#FACC15] font-bold">
              <Info className="w-4 h-4" />
              <span>How to re-enable camera permission:</span>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-[11px] text-zinc-300 pl-1">
              <li>Click the <strong>Lock (🔒) or Tune (⚙️) icon</strong> on the left side of your browser URL bar.</li>
              <li>Toggle <strong>Camera</strong> from &quot;Block&quot; to <strong>&quot;Allow&quot;</strong>.</li>
              <li>Click <strong>&quot;Try Camera Again&quot;</strong> above.</li>
              <li>If you prefer, simply upload a QR code image or screenshot directly.</li>
            </ol>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between gap-3">
          {availableDevices.length > 1 && (
            <div className="flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-zinc-400" />
              <select
                value={selectedDeviceId}
                onChange={(e) => {
                  setSelectedDeviceId(e.target.value);
                  startCameraStream(e.target.value);
                }}
                className="bg-zinc-950 border border-zinc-800 text-xs text-white rounded-xl px-2.5 py-1.5 font-bold focus:outline-none focus:ring-1 focus:ring-[#3B82F6]"
              >
                {availableDevices.map((dev, idx) => (
                  <option key={dev.deviceId} value={dev.deviceId}>
                    {dev.label || `Camera ${idx + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {hasTorch && isCameraActive && (
            <button
              type="button"
              onClick={toggleTorch}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                torchOn
                  ? 'bg-[#FACC15] text-black border-[#FACC15]'
                  : 'bg-zinc-950 text-zinc-300 border-zinc-800 hover:text-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{torchOn ? 'Flash On' : 'Flash'}</span>
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="ml-auto px-4 py-2 rounded-xl bg-[#3B82F6] text-white hover:bg-[#3B82F6]/90 text-xs font-black flex items-center gap-1.5 transition shadow-[0_0_10px_rgba(59,130,246,0.3)] cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-white" />
            <span>Upload QR Image</span>
          </button>
        </div>
      </div>

      <style>{`
        @keyframes scanLaser {
          0% { top: 8%; opacity: 0.8; }
          50% { opacity: 1; }
          100% { top: 92%; opacity: 0.8; }
        }
      `}</style>
    </div>
  );
};

export default QRScannerModal;
