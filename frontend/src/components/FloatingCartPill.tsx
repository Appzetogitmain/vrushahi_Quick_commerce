import AddToCartAnimation from './AddToCartAnimation';

/**
 * FloatingCartPill Component
 * 
 * This is a wrapper component that uses AddToCartAnimation.
 * It maintains backward compatibility with the existing implementation.
 * 
 * For new implementations, use AddToCartAnimation directly.
 */
interface FloatingCartPillProps {
  /**
   * Bottom offset in pixels.
   */
  bottomOffset?: number;
}

export default function FloatingCartPill({ bottomOffset }: FloatingCartPillProps) {
  return <AddToCartAnimation bottomOffset={bottomOffset} />;
}
