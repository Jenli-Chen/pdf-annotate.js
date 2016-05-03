import PDFJSText from 'pdf-text.js';
import PDFJSAnnotate from '../PDFJSAnnotate';
import getOutputScale from '../utils/getOutputScale';
import roundToDivide from '../utils/roundToDivide';
import approximateFraction from '../utils/approximateFraction';

/**
 * Create a new page to be appended to the DOM.
 *
 * @param {Number} pageNumber The page number that is being created
 * @return {HTMLElement}
 */
export function createPage(pageNumber) {
  let page = document.createElement('div');
  let canvas = document.createElement('canvas');
  let wrapper = document.createElement('div');
  let annoLayer = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  let textLayer = document.createElement('div');

  page.style.visibility = 'hidden';
  page.className = 'page';
  wrapper.className = 'canvasWrapper';
  annoLayer.setAttribute('class', 'annotationLayer');
  textLayer.className = 'textLayer';

  page.setAttribute('id', `pageContainer${pageNumber}`);
  page.setAttribute('data-loaded', 'false');
  page.setAttribute('data-page-number', pageNumber);

  canvas.mozeOpaque = true;
  canvas.setAttribute('id', `page${pageNumber}`);

  page.appendChild(wrapper);
  page.appendChild(annoLayer);
  page.appendChild(textLayer);
  wrapper.appendChild(canvas);

  return page;
}

/**
 * Render a page.
 *
 * @param {String} pageNumber The page number to be rendered
 * @param {Object} renderOptions The options for rendering
 * @return {Promise}
 */
export function renderPage(pageNumber, renderOptions) {
  let {
    documentId,
    pdfDocument,
    scale,
    rotate
  } = renderOptions;

  return Promise.all([
    pdfDocument.getPage(pageNumber),
    PDFJSAnnotate.getAnnotations(documentId, pageNumber)
  ]).then(([pdfPage, annotations]) => {
    let page = document.getElementById(`pageContainer${pageNumber}`);
    let canvas = page.querySelector('canvas');
    let svg = page.querySelector('svg');
    let wrapper = page.querySelector('.canvasWrapper');
    let container = page.querySelector('.textLayer');
    let canvasContext = canvas.getContext('2d', {alpha: false});
    let outputScale = getOutputScale(canvasContext);
    let viewport = pdfPage.getViewport(scale, rotate);
    let transform = !outputScale.scaled ? null : [outputScale.sx, 0, 0, outputScale.sy, 0, 0];
    let sfx = approximateFraction(outputScale.sx);
    let sfy = approximateFraction(outputScale.sy);

    page.style.visibility = '';
    canvas.width = roundToDivide(viewport.width * outputScale.sx, sfx[0]);
    canvas.height = roundToDivide(viewport.height * outputScale.sy, sfy[0]);
    canvas.style.width = roundToDivide(viewport.width, sfx[1]) + 'px';
    canvas.style.height = roundToDivide(viewport.height, sfx[1]) + 'px';
    svg.setAttribute('width', viewport.width);
    svg.setAttribute('height', viewport.height);
    svg.style.width = `${viewport.width}px`;
    svg.style.height = `${viewport.height}px`;
    page.style.width = `${viewport.width}px`;
    page.style.height = `${viewport.height}px`;
    wrapper.style.width = `${viewport.width}px`;
    wrapper.style.height = `${viewport.height}px`;
    container.style.width = `${viewport.width}px`;
    container.style.height = `${viewport.height}px`;

    pdfPage.render({
      canvasContext,
      viewport,
      transform
    });

    PDFJSAnnotate.render(svg, viewport, annotations);

    pdfPage.getTextContent({normalizeWhitespace: true}).then(textContent => {
      PDFJSText.render({
        textContent,
        container,
        viewport,
        textDivs: []
      });
    });

    page.setAttribute('data-loaded', 'true');

    return [pdfPage, annotations];
  });
}
