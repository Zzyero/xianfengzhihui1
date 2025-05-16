import { useState, useEffect, useRef, forwardRef, CSSProperties } from 'react';

interface LazyImageProps {
  src: string;
  alt: string;
  placeholderSrc?: string;
  className?: string;
  style?: CSSProperties;
  onLoad?: () => void;
  onError?: () => void;
  initialInView?: boolean;
}

const LazyImage = forwardRef<HTMLImageElement, LazyImageProps>(
  ({ src, alt, placeholderSrc, className = '', style, onLoad, onError, initialInView = false }, ref) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [isInView, setIsInView] = useState(initialInView);
    const localImgRef = useRef<HTMLImageElement>(null);
    
    // 使用传入的ref或本地ref
    const imgRef = (ref || localImgRef) as React.RefObject<HTMLImageElement>;

    useEffect(() => {
      // 如果已经初始化为可见，则不需要设置观察者
      if (initialInView) {
        return;
      }
      
      const observer = new IntersectionObserver((entries) => {
        const [entry] = entries;
        setIsInView(entry.isIntersecting);
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
    }, [imgRef, initialInView]);

    // 图片加载完成处理
    const handleImageLoaded = () => {
      setIsLoaded(true);
      if (onLoad) onLoad();
    };

    // 图片加载错误处理
    const handleImageError = () => {
      if (onError) onError();
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
          src={isInView ? src : ''}
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