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
} from 'lucide-react';
import { parseCryptoQR, type ScannedQRData } from '@/lib/qrParser';

export type { ScannedQRData };

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (data: ScannedQRData) => void;
  title?: string;
  expectedType?: 'evm' | 'btc' | 'any';
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
  title = 'Scan Recipient QR Code',
  expectedType = 'evm',
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isPermissionDenied, setIsPermissionDenied] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedResult, setScannedResult] = useState<ScannedQRData | null>(null);
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const animFrameIdRef = useRef<number | null>(null);

  // Stop current video stream
  const stopCamera = useCallback(() => {
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setIsScanning(false);
  }, [stream]);

  // Start video stream with selected device / facing mode
  const startCamera = useCallback(async (deviceId?: string) => {
    setCameraError(null);
    setIsPermissionDenied(false);
    setScannedResult(null);

    // Stop any existing stream
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported by your browser environment.');
      }

      const constraints: MediaStreamConstraints = {
        video: deviceId
          ? { deviceId: { exact: deviceId } }
          : {
              facingMode: { ideal: 'environment' },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
        audio: false,
      };

      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(newStream);

      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
      }

      setIsScanning(true);

      // Check if torch / flash is supported
      const track = newStream.getVideoTracks()[0];
      const capabilities = track.getCapabilities ? (track.getCapabilities() as unknown as { torch?: boolean }) : null;
      setHasTorch(Boolean(capabilities && capabilities.torch));

      // Get available cameras list
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevs = devices.filter((d) => d.kind === 'videoinput');
      setAvailableDevices(videoDevs);
      if (!deviceId && videoDevs.length > 0) {
        const activeTrack = track.getSettings();
        if (activeTrack.deviceId) {
          setSelectedDeviceId(activeTrack.deviceId);
        }
      }
    } catch (err: unknown) {
      const errorObj = err as { name?: string; message?: string };
      console.warn('Camera stream error:', err);
      let msg = 'Unable to access camera. Please allow camera permissions or upload a QR image.';
      if (errorObj?.name === 'NotAllowedError' || errorObj?.name === 'PermissionDeniedError') {
        setIsPermissionDenied(true);
        msg = 'Camera permission was denied. You can enable it in your browser address bar (lock/tune icon) or easily upload/drag a QR code image screenshot below.';
      } else if (errorObj?.name === 'NotFoundError' || errorObj?.name === 'DevicesNotFoundError') {
        msg = 'No video camera detected on your device. You can upload a QR image or screenshot instead.';
      }
      setCameraError(msg);
      setIsScanning(false);
    }
  }, [stream]);

  // Toggle torch / flashlight
  const toggleTorch = async () => {
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    if (track && hasTorch) {
      try {
        const nextState = !torchOn;
        await track.applyConstraints({
          advanced: [{ torch: nextState } as unknown as MediaTrackConstraintSet],
        });
        setTorchOn(nextState);
      } catch (e) {
        console.warn('Torch toggle failed:', e);
      }
    }
  };

  // Continuous frame analysis via requestAnimationFrame
  const scanLoop = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) {
      animFrameIdRef.current = requestAnimationFrame(scanLoop);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      });

      if (code && code.data) {
        const parsed = parseCryptoQR(code.data);
        if (parsed.address) {
          setScannedResult(parsed);
          stopCamera();

          if (typeof navigator.vibrate === 'function') {
            navigator.vibrate([100, 50, 100]);
          }

          setTimeout(() => {
            onScanSuccess(parsed);
            onClose();
          }, 600);
          return;
        }
      }
    }

    animFrameIdRef.current = requestAnimationFrame(scanLoop);
  }, [onScanSuccess, onClose, stopCamera]);

  useEffect(() => {
    if (isScanning) {
      animFrameIdRef.current = requestAnimationFrame(scanLoop);
    }
    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
      }
    };
  }, [isScanning, scanLoop]);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
      setScannedResult(null);
      setCameraError(null);
      setIsPermissionDenied(false);
      setTorchOn(false);
      setShowGuide(false);
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  // Process image file for QR
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
            stopCamera();
            setTimeout(() => {
              onScanSuccess(parsed);
              onClose();
            }, 600);
          } else {
            setCameraError(`QR code found but no valid crypto address detected: "${code.data.slice(0, 60)}"`);
          }
        } else {
          setCameraError('No readable QR code found in the image. Please try a clearer screenshot or photo.');
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <div className="relative w-full max-w-lg bg-[#022c22] border border-emerald-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-[#042f22] border-b border-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-yellow-200 text-zinc-900 flex items-center justify-center font-black">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">{title}</h3>
              <p className="text-xs text-yellow-200/90 font-medium">
                {expectedType === 'btc' ? 'Bitcoin UTXO BIP-21 or Address' : 'Polygon & Ethereum EIP-681 / Address'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowGuide(!showGuide)}
              className="p-1.5 rounded-lg bg-emerald-950 border border-emerald-700 text-sky-200 hover:text-white text-xs font-semibold flex items-center gap-1 transition"
              title="Camera Permission Guide"
            >
              <HelpCircle className="w-4 h-4 text-yellow-300" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-emerald-950/80 border border-emerald-700 text-slate-300 hover:text-white hover:bg-emerald-900 flex items-center justify-center transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Viewfinder / Video Canvas area */}
        <div className="relative bg-zinc-950 aspect-[4/3] w-full flex items-center justify-center overflow-hidden">
          <canvas ref={canvasRef} className="hidden" />

          {/* Active Live Video Element */}
          <video
            ref={videoRef}
            className={`w-full h-full object-cover ${cameraError ? 'hidden' : 'block'}`}
            muted
            autoPlay
            playsInline
          />

          {/* Scanner Optical Viewfinder Overlay */}
          {!cameraError && isScanning && !scannedResult && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="relative w-64 h-64 sm:w-72 sm:h-72 border-2 border-yellow-300/80 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.6)]">
                {/* 4 Corner Markers */}
                <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-yellow-300 rounded-tl-lg" />
                <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-yellow-300 rounded-tr-lg" />
                <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-yellow-300 rounded-bl-lg" />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-yellow-300 rounded-br-lg" />

                {/* Laser scan line */}
                <div className="absolute left-2 right-2 h-0.5 bg-yellow-300 shadow-[0_0_12px_#fde047] animate-bounce duration-1000 top-1/2 -translate-y-1/2" />

                <div className="absolute bottom-2 inset-x-0 text-center">
                  <span className="px-2.5 py-0.5 rounded-full bg-zinc-900/90 text-yellow-300 text-[10px] font-black tracking-wider uppercase">
                    Detecting Crypto Address...
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Drag and drop overlay */}
          {isDragging && (
            <div className="absolute inset-0 bg-emerald-950/95 border-2 border-dashed border-yellow-300 flex flex-col items-center justify-center p-6 text-center z-10">
              <Upload className="w-12 h-12 text-yellow-300 mb-2 animate-bounce" />
              <p className="text-sm font-extrabold text-white">Drop QR Code Image Here</p>
              <p className="text-xs text-yellow-200">Will automatically parse address instantly</p>
            </div>
          )}

          {/* Success Overlay state */}
          {scannedResult && (
            <div className="absolute inset-0 bg-emerald-950/95 flex flex-col items-center justify-center p-6 text-center animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-full bg-yellow-200 text-zinc-900 flex items-center justify-center mb-3 shadow-lg">
                <CheckCircle2 className="w-10 h-10 text-emerald-950" />
              </div>
              <h4 className="text-lg font-black text-white">QR Code Recognized!</h4>
              <p className="text-xs text-yellow-200 mt-1 font-mono break-all max-w-xs bg-black/40 p-2.5 rounded-xl border border-yellow-300/30">
                {scannedResult.address}
              </p>
              {scannedResult.amount && (
                <span className="mt-2 px-3 py-1 rounded-full bg-yellow-200 text-zinc-900 text-xs font-black">
                  Amount: {scannedResult.amount} {scannedResult.tokenSymbol || ''}
                </span>
              )}
            </div>
          )}

          {/* Camera Error / Permission Denied State */}
          {cameraError && (
            <div className="p-5 text-center max-w-md flex flex-col items-center justify-center w-full h-full bg-[#022c22]/90 backdrop-blur">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/50 text-yellow-300 flex items-center justify-center mb-2.5 shadow-md">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-extrabold text-white mb-1">
                {isPermissionDenied ? 'Camera Access Denied' : 'Camera Unavailable'}
              </h4>
              <p className="text-xs text-slate-300 mb-3 px-2 leading-relaxed">
                {cameraError}
              </p>

              {/* Direct Drag & Drop / Upload Box */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-emerald-600 hover:border-yellow-300 bg-emerald-950/70 hover:bg-emerald-950 cursor-pointer rounded-2xl p-4 mb-3 transition flex flex-col items-center justify-center gap-1.5"
              >
                <div className="w-9 h-9 rounded-xl bg-yellow-200 text-zinc-900 flex items-center justify-center">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <span className="text-xs font-black text-white">
                  Click or Drag & Drop QR Image / Screenshot
                </span>
                <span className="text-[10px] text-yellow-200 font-medium">
                  Instant decode for all PNG, JPG, or WebP QR codes
                </span>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={() => startCamera(selectedDeviceId)}
                  className="px-4 py-2 rounded-xl bg-yellow-200 text-zinc-900 text-xs font-extrabold flex items-center gap-1.5 hover:bg-yellow-300 transition shadow"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Try Camera Again</span>
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 rounded-xl bg-emerald-900 text-white border border-emerald-700 text-xs font-extrabold flex items-center gap-1.5 hover:bg-emerald-800 transition"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Select File</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* How to enable permissions expandable guide */}
        {showGuide && (
          <div className="p-4 bg-[#032016] border-t border-emerald-800 text-xs space-y-2 text-slate-300 animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-1.5 text-yellow-300 font-bold">
              <Info className="w-4 h-4" />
              <span>How to re-enable camera permission:</span>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-200 pl-1">
              <li>Click the <strong>Lock (🔒) or Tune (⚙️) icon</strong> on the left side of your browser URL bar.</li>
              <li>Toggle <strong>Camera</strong> from &quot;Block&quot; to <strong>&quot;Allow&quot;</strong>.</li>
              <li>Refresh or click <strong>&quot;Try Camera Again&quot;</strong> above.</li>
              <li>If testing inside an embedded preview iframe, click the <strong>Open in New Tab</strong> button in the top-right header for direct hardware access.</li>
            </ol>
          </div>
        )}

        {/* Footer Controls */}
        <div className="p-4 bg-[#032419] border-t border-emerald-800/80 flex items-center justify-between gap-3">
          {/* Switch Camera if multiple available */}
          {availableDevices.length > 1 && (
            <select
              value={selectedDeviceId}
              onChange={(e) => {
                setSelectedDeviceId(e.target.value);
                startCamera(e.target.value);
              }}
              className="bg-emerald-950 border border-emerald-700 text-xs text-white rounded-xl px-2.5 py-1.5 font-bold focus:outline-none focus:ring-1 focus:ring-yellow-300"
            >
              {availableDevices.map((dev, idx) => (
                <option key={dev.deviceId} value={dev.deviceId}>
                  {dev.label || `Camera ${idx + 1}`}
                </option>
              ))}
            </select>
          )}

          {/* Flashlight toggle if supported */}
          {hasTorch && isScanning && (
            <button
              type="button"
              onClick={toggleTorch}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition ${
                torchOn
                  ? 'bg-yellow-200 text-zinc-900 border-yellow-300'
                  : 'bg-emerald-950 text-slate-300 border-emerald-800 hover:text-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{torchOn ? 'Flash On' : 'Flash'}</span>
            </button>
          )}

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />

          {/* Upload QR screenshot button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="ml-auto px-4 py-2 rounded-xl bg-yellow-200 text-zinc-900 hover:bg-yellow-300 text-xs font-black flex items-center gap-1.5 transition shadow"
          >
            <Upload className="w-3.5 h-3.5 text-zinc-900" />
            <span>Upload QR Image</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default QRScannerModal;
