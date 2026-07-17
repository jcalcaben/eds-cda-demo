import {
  InLineAlert,
  Icon,
  Button,
  provider as UI,
} from '@dropins/tools/components.js';
import { h } from '@dropins/tools/preact.js';
import { events } from '@dropins/tools/event-bus.js';
import { tryRenderAemAssetsImage } from '@dropins/tools/lib/aem/assets.js';
import * as pdpApi from '@dropins/storefront-pdp/api.js';
import { render as pdpRendered } from '@dropins/storefront-pdp/render.js';
import { render as wishlistRender } from '@dropins/storefront-wishlist/render.js';

import { WishlistToggle } from '@dropins/storefront-wishlist/containers/WishlistToggle.js';
import { WishlistAlert } from '@dropins/storefront-wishlist/containers/WishlistAlert.js';

// Containers
import ProductHeader from '@dropins/storefront-pdp/containers/ProductHeader.js';
import ProductPrice from '@dropins/storefront-pdp/containers/ProductPrice.js';
import ProductShortDescription from '@dropins/storefront-pdp/containers/ProductShortDescription.js';
import ProductOptions from '@dropins/storefront-pdp/containers/ProductOptions.js';
import ProductQuantity from '@dropins/storefront-pdp/containers/ProductQuantity.js';
import ProductDescription from '@dropins/storefront-pdp/containers/ProductDescription.js';
import ProductAttributes from '@dropins/storefront-pdp/containers/ProductAttributes.js';
import ProductGallery from '@dropins/storefront-pdp/containers/ProductGallery.js';
import ProductGiftCardOptions from '@dropins/storefront-pdp/containers/ProductGiftCardOptions.js';

// Libs
import {
  rootLink,
  setJsonLd,
  fetchPlaceholders,
  getProductLink,
} from '../../scripts/commerce.js';

// Initializers
import { IMAGES_SIZES } from '../../scripts/initializers/pdp.js';
import '../../scripts/initializers/cart.js';
import '../../scripts/initializers/wishlist.js';

function createSvgIcon(pathData, viewBox = '0 0 24 24') {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', viewBox);
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.classList.add('product-details__share-icon');

  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', pathData);
  svg.appendChild(path);
  return svg;
}

function buildShareUrl(type, encodedUrl) {
  switch (type) {
    case 'facebook':
      return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
    case 'x':
      return `https://twitter.com/intent/tweet?url=${encodedUrl}`;
    case 'linkedin':
      return `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
    default:
      return '';
  }
}

function openSharePopup(url, platform) {
  try {
    const features = 'noopener,noreferrer,width=600,height=600';
    const popup = window.open(url, '_blank', features);
    if (popup) {
      popup.opener = null;
      return true;
    }
    console.warn('Share popup blocked', { platform });
    return false;
  } catch (error) {
    console.error('Failed to open share popup', { platform, error });
    return false;
  }
}

async function copyCurrentUrl(currentUrl, statusEl) {
  try {
    if (!navigator.clipboard?.writeText) {
      throw new Error('Clipboard API unavailable');
    }
    await navigator.clipboard.writeText(currentUrl);
    statusEl.textContent = 'Copied';
    statusEl.hidden = false;
    window.clearTimeout(statusEl._hideTimer);
    statusEl._hideTimer = window.setTimeout(() => {
      statusEl.hidden = true;
      statusEl.textContent = '';
    }, 1800);
    return true;
  } catch (error) {
    console.error('Failed to copy share link', { error });
    statusEl.textContent = '';
    statusEl.hidden = true;
    return false;
  }
}

function createShareButton({ label, platform, icon, onClick }) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'product-details__share-button';
  button.setAttribute('aria-label', label);
  button.title = label;
  button.appendChild(icon);
  button.addEventListener('click', onClick);
  button.dataset.platform = platform;
  return button;
}

function renderShareRow(container, labels) {
  if (!container) return;
  container.replaceChildren();

  const currentUrl = window.location.href;
  const encodedUrl = encodeURIComponent(currentUrl);
  const row = document.createElement('div');
  row.className = 'product-details__share-row';

  const facebookButton = createShareButton({
    label: 'Facebook',
    platform: 'facebook',
    icon: createSvgIcon('M13.5 8H15V5h-1.5C11.57 5 10 6.57 10 8.5V10H8v3h2v6h3v-6h2.22l.28-3H13v-1.5c0-.28.22-.5.5-.5Z'),
    onClick: () => openSharePopup(buildShareUrl('facebook', encodedUrl), 'facebook'),
  });

  const xButton = createShareButton({
    label: 'X/Twitter',
    platform: 'x',
    icon: createSvgIcon('M18.89 3H21l-5.8 6.62L22 21h-5.52l-4.32-5.47L7.36 21H5.25l6.2-7.08L2 3h5.66l3.92 4.97L18.89 3Zm-1.93 16h1.47L6.86 4.95H5.29L16.96 19Z'),
    onClick: () => openSharePopup(buildShareUrl('x', encodedUrl), 'x'),
  });

  const linkedInButton = createShareButton({
    label: 'LinkedIn',
    platform: 'linkedin',
    icon: createSvgIcon('M6.94 7.5A1.95 1.95 0 1 1 6.95 3.6 1.95 1.95 0 0 1 6.94 7.5ZM5.5 20.4V9h2.88v11.4H5.5Zm4.24 0V9h2.76v1.56h.04c.38-.72 1.32-1.48 2.72-1.48 2.9 0 3.44 1.9 3.44 4.38v6.94h-2.88v-6.16c0-1.47-.03-3.36-2.05-3.36-2.05 0-2.36 1.6-2.36 3.25v6.27H9.74Z'),
    onClick: () => openSharePopup(buildShareUrl('linkedin', encodedUrl), 'linkedin'),
  });

  const copyStatus = document.createElement('span');
  copyStatus.className = 'product-details__share-status';
  copyStatus.hidden = true;
  copyStatus.setAttribute('aria-live', 'polite');

  const copyButton = createShareButton({
    label: 'Copy Link',
    platform: 'copy',
    icon: createSvgIcon('M16 1H6a2 2 0 0 0-2 2v12h2V3h10V1Zm3 4H10a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Zm0 16H10V7h9v14Z'),
    onClick: () => copyCurrentUrl(currentUrl, copyStatus),
  });

  row.appendChild(facebookButton);
  row.appendChild(xButton);
  row.appendChild(linkedInButton);
  row.appendChild(copyButton);
  row.appendChild(copyStatus);
  container.appendChild(row);
}

/**
 * Checks if the page has prerendered product JSON-LD data
 * @returns {boolean} True if product JSON-LD exists and contains @type=Product
 */
function isProductPrerendered() {
  const jsonLdScript = document.querySelector('script[type="application/ld+json"]');

  if (!jsonLdScript?.textContent) {
    return false;
  }

  try {
    const jsonLd = JSON.parse(jsonLdScript.textContent);
    return jsonLd?.['@type'] === 'Product';
  } catch (error) {
    console.debug('Failed to parse JSON-LD:', error);
    return false;
  }
}

function updateAddToCartButtonText(addToCartInstance, inCart, labels) {
  const buttonText = inCart
    ? labels.Global?.UpdateProductInCart
    : labels.Global?.AddProductToCart;
  if (addToCartInstance) {
    addToCartInstance.setProps((prev) => ({
      ...prev,
      children: buttonText,
    }));
  }
}

/**
 * Formats numeric attribute values for display (e.g., "10.000000" → "10").
 * Non-numeric values are returned as-is.
 */
function formatNumericAttributeValue(value) {
  const trimmed = value.trim();
  if (!/^[+-]?\d+(\.\d+)?$/.test(trimmed)) return value;
  return new Intl.NumberFormat(document.documentElement.lang).format(Number(trimmed));
}

export default async function decorate(block) {
  const eventProduct = events.lastPayload('pdp/data') ?? null;
  const product = eventProduct?.sku ? eventProduct : null;
  const labels = await fetchPlaceholders();
  const urlParams = new URLSearchParams(window.location.search);
  const itemUidFromUrl = urlParams.get('itemUid');
  let isUpdateMode = false;

  const fragment = document.createRange().createContextualFragment(`
    <div class="product-details__alert"></div>
    <div class="product-details__wrapper">
      <div class="product-details__left-column">
        <div class="product-details__gallery"></div>
      </div>
      <div class="product-details__right-column">
        <div class="product-details__header"></div>
        <div class="product-details__share"></div>
        <div class="product-details__price"></div>
        <div class="product-details__