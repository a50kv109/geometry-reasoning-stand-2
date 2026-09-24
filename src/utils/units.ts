/**
 * Утилиты двухуровневого представления геометрических величин:
 * - Учебная единица (по умолчанию условные мм)
 * - Техническая внутренняя единица (px для рендеринга и точных вычислений)
 */

export interface TwoLevelLength {
  mm: string;
  px: string;
  mmVal: number;
  pxVal: number;
  full: string;
}

export interface TwoLevelArea {
  mm: string;
  px: string;
  mmVal: number;
  pxVal: number;
  full: string;
}

/**
 * Преобразование длины из внутренних px в двухуровневое отображение
 * @param pxValue Значение длины в px
 * @param scale Масштаб (по умолчанию 1 px = 1 мм)
 * @param precision Знаков после запятой
 */
export function formatTwoLevelLength(
  pxValue: number,
  scale: number = 1.0,
  precision: number = 1
): TwoLevelLength {
  const mmVal = pxValue * scale;
  const mm = `${mmVal.toFixed(precision)} мм`;
  const px = `${pxValue.toFixed(precision)} px`;
  return {
    mm,
    px,
    mmVal,
    pxVal: pxValue,
    full: `${mm} (${px})`,
  };
}

/**
 * Преобразование площади из внутренних px² в двухуровневое отображение
 */
export function formatTwoLevelArea(
  pxArea: number,
  scale: number = 1.0,
  precision: number = 1
): TwoLevelArea {
  const mmArea = pxArea * (scale * scale);
  const mm = `${mmArea.toFixed(precision)} мм²`;
  const px = `${pxArea.toFixed(precision)} px²`;
  return {
    mm,
    px,
    mmVal: mmArea,
    pxVal: pxArea,
    full: `${mm} (${px})`,
  };
}
