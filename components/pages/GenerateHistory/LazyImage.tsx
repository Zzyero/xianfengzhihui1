import { useState, useEffect, useRef, forwardRef, CSSProperties } from 'react';

// 1x1透明gif，用于替换不在视口中的图片，减少内存占用
const TRANSPARENT_PIXEL = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

interface LazyImageProps {
  src: string;
  alt: string;
  placeholderSrc?: string;
  className?: string;
  style?: CSSProperties;
  onLoad?: () => void;
  onError?: () => void;
  initialInView?: boolean;
  unloadWhenNotVisible?: boolean;
}

const LazyImage = forwardRef<HTMLImageElement, LazyImageProps>(
  ({ 
    src, 
    alt, 
    placeholderSrc, 
    className = '', 
    style, 
    onLoad, 
    onError, 
    initialInView = false,
    unloadWhenNotVisible = true
  }, ref) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [isInView, setIsInView] = useState(initialInView);
    const [currentSrc, setCurrentSrc] = useState<string>(initialInView ? src : '');
    const localImgRef = useRef<HTMLImageElement>(null);
    
    // 使用传入的ref或本地ref
    const imgRef = (ref || localImgRef) as React.RefObject<HTMLImageElement>;

    // 当src更改时，更新currentSrc
    useEffect(() => {
      if (isInView) {
        setCurrentSrc(src);
      }
    }, [src, isInView]);

    useEffect(() => {
      // 如果已经初始化为可见且不需要监控卸载，则不需要设置观察者
      if (initialInView && !unloadWhenNotVisible) {
        return;
      }
      
      const observer = new IntersectionObserver((entries) => {
        const [entry] = entries;
        const isVisible = entry.isIntersecting;
        setIsInView(isVisible);
        
        // 当图片不在视口且启用了卸载功能，将图片替换为1x1透明像素
        if (!isVisible && unloadWhenNotVisible) {
          // 如果已经加载过，我们保留加载状态，但卸载图片内容
          if (isLoaded) {
            setCurrentSrc(TRANSPARENT_PIXEL);
          } else {
            setCurrentSrc('');
          }
        } else if (isVisible) {
          // 当图片重新进入视口，恢复图片
          setCurrentSrc(src);
        }
      }, {
        root: null, // 使用视口作为根
        rootMargin: '200px', // 提前200px加载，增加预加载区域
        threshold: 0.1 // 只要有10%可见就开始加载
      });

      if (imgRef.current) {
        observer.observe(imgRef.current);
      }

      return () => {
        if (imgRef.current) {
          observer.unobserve(imgRef.current);
        }
      };
    }, [imgRef, initialInView, unloadWhenNotVisible, src, isLoaded]);

    // 图片加载完成处理
    const handleImageLoaded = () => {
      if (currentSrc !== TRANSPARENT_PIXEL && currentSrc !== '') {
        setIsLoaded(true);
        if (onLoad) onLoad();
      }
    };

    // 图片加载错误处理
    const handleImageError = () => {
      if (onError && currentSrc !== TRANSPARENT_PIXEL) {
        onError();
      }
    };

    return (
      <div className={`lazy-image-container ${className}`} style={style}>
        {!isLoaded && (
          <div className="lazy-image-placeholder">
            {placeholderSrc ? (
              <img 
                src={placeholderSrc} 
                alt="Loading..." 
                className="placeholder-img"
              />
            ) : (
              <div className="placeholder-shimmer"></div>
            )}
          </div>
        )}
        <img
          ref={imgRef}
          src={currentSrc}
          alt={alt}
          className={`lazy-image ${isLoaded ? 'loaded' : 'loading'}`}
          onLoad={handleImageLoaded}
          onError={handleImageError}
          loading="lazy"
        />
      </div>
    );
  }
);

LazyImage.displayName = 'LazyImage';

export default LazyImage; 