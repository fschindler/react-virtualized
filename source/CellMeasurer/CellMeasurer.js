/** @flow */
import { PureComponent } from 'react'
import { findDOMNode } from 'react-dom'

type Props = {
  cache: mixed,
  children: mixed,
  columnIndex: number,
  parent: mixed,
  rowIndex: number,
  style: mixed
};

/**
 * Wraps a cell and measures its rendered content.
 * Measurements are stored in a per-cell cache.
 * Cached-content is not be re-measured.
 */
export default class CellMeasurer extends PureComponent {
  props: Props;

  constructor (props, context) {
    super(props, context)

    this._measure = this._measure.bind(this)
  }

  componentDidMount () {
    this._maybeMeasureCell()
  }

  componentDidUpdate (prevProps, prevState) {
    this._maybeMeasureCell()
  }

  render () {
    const { children } = this.props

    return typeof children === 'function'
      ? children({ measure: this._measure })
      : children
  }

  _maybeMeasureCell () {
    const { cache, columnIndex, parent, rowIndex } = this.props

    if (!cache.has(rowIndex, columnIndex)) {
      const node = findDOMNode(this)

      // TODO Check for a bad combination of fixedWidth and missing numeric width or vice versa with height

      // Even if we are measuring initially- if we're inside of a MultiGrid component,
      // Explicitly clear width/height before measuring to avoid being tainted by another Grid.
      // eg top/left Grid renders before bottom/right Grid
      // Since the CellMeasurerCache is shared between them this taints derived cell size values.
      let cachedWidth
      let cachedHeight
      if (!cache.hasFixedWidth()) {
        cachedWidth = node.style.width
        node.style.width = 'auto'
      }
      if (!cache.hasFixedHeight()) {
        cachedHeight = node.style.height
        node.style.height = 'auto'
      }

      const height = Math.ceil(node.offsetHeight)
      const width = Math.ceil(node.offsetWidth)

      if (!cache.hasFixedWidth()) {
        node.style.width = cachedWidth
      }
      if (!cache.hasFixedHeight()) {
        node.style.height = cachedHeight
      }

      cache.set(
        rowIndex,
        columnIndex,
        width,
        height
      )

      // If size has changed, let Grid know to re-render.
      if (
        parent &&
        typeof parent.invalidateCellSizeAfterRender === 'function'
      ) {
        parent.invalidateCellSizeAfterRender({
          columnIndex,
          rowIndex
        })
      }
    }
  }

  _measure () {
    const { cache, columnIndex, parent, rowIndex } = this.props

    const node = findDOMNode(this)

    // If we are re-measuring a cell that has already been measured,
    // It will have a hard-coded width/height from the previous measurement.
    // The fact that we are measuring indicates this measurement is probably stale,
    // So explicitly clear it out (eg set to "auto") so we can recalculate.
    // See issue #593 for more info.
    if (!cache.hasFixedWidth()) {
      node.style.width = 'auto'
    }
    if (!cache.hasFixedHeight()) {
      node.style.height = 'auto'
    }

    const height = Math.ceil(node.offsetHeight)
    const width = Math.ceil(node.offsetWidth)

    if (
      height !== cache.getHeight(rowIndex, columnIndex) ||
      width !== cache.getWidth(rowIndex, columnIndex)
    ) {
      cache.set(
        rowIndex,
        columnIndex,
        width,
        height
      )

      if (
        parent &&
        typeof parent.recomputeGridSize === 'function'
      ) {
        parent.recomputeGridSize({
          columnIndex,
          rowIndex
        })
      }
    }
  }
}

// Used for DEV mode warning check
if (process.env.NODE_ENV !== 'production') {
  CellMeasurer.__internalCellMeasurerFlag = true
}
