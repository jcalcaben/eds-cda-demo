import { describe, it, expect, beforeEach, vi } from 'vitest';
import decorate from './product-details.js';

vi.mock('../../scripts/commerce.js', () => ({
  rootLink: (path) => path,
  setJsonLd: vi.fn(),
  fetchPlaceholders: vi.fn(async () => ({ Global: {} })),
  getProductLink: vi.fn(() => '/product'),
}));

vi.mock('@dropins/tools/event-bus.js', () => ({
  events: {
    lastPayload: vi.fn(() => ({ sku: 'sku-1' })),
    on: vi.fn(),
  },
}));

vi.mock('@dropins/tools/components.js', () => ({
  InLineAlert: vi.fn(),
  Icon: vi.fn(),
  Button: vi.fn(),
  provider: vi.fn(() => vi.fn()),
}));

vi.mock('@dropins/tools/preact.js', () => ({ h: vi.fn() }));
vi.mock('@dropins/tools/lib/aem/assets.js', () => ({ tryRenderAemAssetsImage: vi.fn() }));
vi.mock('@dropins/storefront-pdp/api.js', () => ({
  getProductConfigurationValues: vi.fn(() => ({})),
  isProductConfigurationValid: vi.fn(() => true),
}));
vi.mock('@dropins/storefront-pdp/render.js', () => ({
  render: vi.fn(() => async () => ({ })),
}));
vi.mock('@dropins/storefront-wishlist/render.js', () => ({
  render: vi.fn(() => async () => ({ })),
}));
vi.mock('@dropins/storefront-wishlist/containers/WishlistToggle.js', () => ({ default: {} }));
vi.mock('@dropins/storefront-wishlist/containers/WishlistAlert.js', () => ({ default: {} }));
vi.mock('@dropins/storefront-pdp/containers/ProductHeader.js', () => ({ default: {} }));
vi.mock('@dropins/storefront-pdp/containers/ProductPrice.js', () => ({ default: {} }));
vi.mock('@dropins/storefront-pdp/containers/ProductShortDescription.js', () => ({ default: {} }));
vi.mock('@dropins/storefront-pdp/containers/ProductOptions.js', () => ({ default: {} }));
vi.mock('@dropins/storefront-pdp/containers/ProductQuantity.js', () => ({ default: {} }));
vi.mock('@dropins/storefront-pdp/containers/ProductDescription.js', () => ({ default: {} }));
vi.mock('@dropins/storefront-pdp/containers/ProductAttributes.js', () => ({ default: {} }));
vi.mock('@dropins/storefront-pdp/containers/ProductGallery.js', () => ({ default: {} }));
vi.mock('@dropins/storefront-pdp/containers/ProductGiftCardOptions.js', () => ({ default: {} }));

function setupDom() {
  document.body.innerHTML = '<div class="product-details"></div>';
  return document.querySelector('.product-details');
}

describe('product-details share row', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
    window.history.replaceState({}, '', 'https://example.com/products/widget?foo=bar');
  });

  it('renders four icon-only share actions between header and price', async () => {
    const block = setupDom();
    await decorate(block);

    const share = block.querySelector('.product-details__share');
    expect(share).toBeTruthy();
    expect(share.previousElementSibling.classList.contains('product-details__header')).toBe(true);
    expect(share.nextElementSibling.classList.contains('product-details__price')).toBe(true);

    const buttons = share.querySelectorAll('button');
    expect(buttons).toHaveLength(4);
    expect([...buttons].map((button) => button.getAttribute('aria-label'))).toEqual([
      'Facebook',
      'X/Twitter',
      'LinkedIn',
      'Copy Link',
    ]);
    expect([...buttons].every((button) => button.textContent.trim() === '')).toBe(true);
  });

  it('opens safe popup share URLs for the social buttons', async () => {
    const block = setupDom();
    const openSpy = vi.spyOn(window, 'open').mockReturnValue({ opener: null });
    await decorate(block);

    const [facebook, xButton, linkedIn] = block.querySelectorAll('.product-details__share-row button');
    facebook.click();
    xButton.click();
    linkedIn.click();

    expect(openSpy).toHaveBeenCalledTimes(3);
    expect(openSpy.mock.calls[0][0]).toContain('facebook.com/sharer/sharer.php?u=');
    expect(openSpy.mock.calls[1][0]).toContain('twitter.com/intent/tweet?url=');
    expect(openSpy.mock.calls[2][0]).toContain('linkedin.com/sharing/share-offsite/?url=');
    expect(openSpy.mock.calls[0][1]).toBe('_blank');
    expect(openSpy.mock.calls[0][2]).toContain('noopener');
    expect(openSpy.mock.calls[0][2]).toContain('noreferrer');
  });

  it('copies the current page URL and shows confirmation feedback', async () => {
    const block = setupDom();
    const writeText = vi.fn(async () => {});
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    await decorate(block);
    const copyButton = block.querySelector('.product-details__share-row button[data-platform="copy"]');
    copyButton.click();

    expect(writeText).toHaveBeenCalledWith('https://example.com/products/widget?foo=bar');
    const status = block.querySelector('.product-details__share-status');
    expect(status.textContent).toBe('Copied');
    expect(status.hidden).toBe(false);
  });

  it('keeps the UI stable when clipboard copy fails', async () => {
    const block = setupDom();
    const writeText = vi.fn(async () => {
      throw new Error('denied');
    });
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await decorate(block);
    const copyButton = block.querySelector('.product-details__share-row button[data-platform="copy"]');
    copyButton.click();

    expect(writeText).toHaveBeenCalledTimes(1);
    expect(consoleSpy).toHaveBeenCalled();
    const status = block.querySelector('.product-details__share-status');
    expect(status.hidden).toBe(true);
  });
});
