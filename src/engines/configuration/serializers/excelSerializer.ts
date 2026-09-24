// src/engines/configuration/serializers/excelSerializer.ts
// Deterministic tabular & Excel spreadsheet serializers for Geometry Configuration View (GCM-01).
// Supported outputs:
// 1. CSV (Comma-Separated Values, UTF-8 with BOM for Excel compatibility)
// 2. TSV (Tab-Separated Values, perfect for direct clipboard paste)
// 3. Multi-Sheet SpreadsheetML XML (Natively opened by Microsoft Excel, LibreOffice Calc, Apple Numbers)

import { GeometryConfigurationView } from '../types';

/**
 * Escapes a cell value for standard CSV format.
 */
function escapeCsvCell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Escapes text for XML attributes and text content.
 */
function escapeXml(unsafe: string | number | boolean | null | undefined): string {
  if (unsafe === null || unsafe === undefined) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generates a clean CSV representation of the Configuration View.
 */
export function serializeConfigurationToCsv(view: GeometryConfigurationView): string {
  const headers = [
    'ID',
    'Название',
    'Тип сущности',
    'Категория',
    'Роль',
    'Глубина DAG',
    'Родители',
    'Потомки',
    'Метрики',
    'Эпистемический статус',
    'Доказано (Q.E.D.)',
    'ID теоремы',
    'Обоснование / Провенанс',
  ];

  const rows: string[][] = [headers];

  for (const rec of view.records) {
    const metricsStr = Object.entries(rec.metrics)
      .map(([k, v]) => `${k}:${v}`)
      .join('; ');

    rows.push([
      rec.id,
      rec.name,
      rec.kind,
      rec.category,
      rec.role,
      String(rec.depth),
      rec.parentIds.join(', '),
      rec.childIds.join(', '),
      metricsStr,
      rec.epistemicStatus,
      rec.isProven ? 'Да' : 'Нет',
      rec.theoremId || '',
      rec.provenanceNote || '',
    ]);
  }

  // Prepend UTF-8 Byte Order Mark (\uFEFF) for Excel Russian character recognition
  return '\uFEFF' + rows.map((r) => r.map(escapeCsvCell).join(',')).join('\r\n');
}

/**
 * Generates a TSV representation suitable for direct clipboard copying.
 */
export function serializeConfigurationToTsv(view: GeometryConfigurationView): string {
  const headers = [
    'ID',
    'Название',
    'Тип',
    'Категория',
    'Роль',
    'Глубина',
    'Родители',
    'Метрики',
    'Статус',
    'Q.E.D.',
    'Теорема',
    'Обоснование',
  ];

  const rows: string[][] = [headers];

  for (const rec of view.records) {
    const metricsStr = Object.entries(rec.metrics)
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');

    rows.push([
      rec.id,
      rec.name,
      rec.kind,
      rec.category,
      rec.role,
      String(rec.depth),
      rec.parentIds.join(','),
      metricsStr,
      rec.epistemicStatus,
      rec.isProven ? 'ДА' : 'НЕТ',
      rec.theoremId || '-',
      rec.provenanceNote || '-',
    ]);
  }

  return rows.map((r) => r.join('\t')).join('\n');
}

/**
 * Generates a rich multi-sheet SpreadsheetML XML document for Excel.
 * Includes:
 * - Sheet 1: Сводка конфигурации
 * - Sheet 2: Реестр геометрических сущностей
 * - Sheet 3: Топологический DAG связей
 * - Sheet 4: Эпистемический реестр теорем
 */
export function generateExcelXmlWorkbook(view: GeometryConfigurationView): string {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#000000"/>
  </Style>
  <Style ss:ID="Header">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#4F46E5"/>
   </Borders>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#FFFFFF" ss:Bold="1"/>
   <Interior ss:Color="#312E81" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="Title">
   <Font ss:FontName="Calibri" ss:Size="14" ss:Color="#1E1B4B" ss:Bold="1"/>
  </Style>
  <Style ss:ID="Bold">
   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1"/>
  </Style>
  <Style ss:ID="BadgeProven">
   <Alignment ss:Horizontal="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#065F46" ss:Bold="1"/>
   <Interior ss:Color="#D1FAE5" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="BadgeHypothesis">
   <Alignment ss:Horizontal="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#92400E" ss:Bold="1"/>
   <Interior ss:Color="#FEF3C7" ss:Pattern="Solid"/>
  </Style>
 </Styles>

 <!-- 1. СВОДКА -->
 <Worksheet ss:Name="Сводка конфигурации">
  <Table>
   <Column ss:Width="220"/>
   <Column ss:Width="300"/>
   <Row>
    <Cell ss:StyleID="Title"><Data ss:Type="String">GEOMETRY CONFIGURATION VIEW</Data></Cell>
   </Row>
   <Row><Cell><Data ss:Type="String"></Data></Cell></Row>
   <Row>
    <Cell ss:StyleID="Bold"><Data ss:Type="String">Идентификатор конфигурации</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(view.configurationId)}</Data></Cell>
   </Row>
   <Row>
    <Cell ss:StyleID="Bold"><Data ss:Type="String">Радиус окружности R (мм)</Data></Cell>
    <Cell><Data ss:Type="Number">${view.summary.circumradius}</Data></Cell>
   </Row>
   <Row>
    <Cell ss:StyleID="Bold"><Data ss:Type="String">Масштаб (1 px = мм)</Data></Cell>
    <Cell><Data ss:Type="Number">${view.summary.scale}</Data></Cell>
   </Row>
   <Row>
    <Cell ss:StyleID="Bold"><Data ss:Type="String">Всего сущностей</Data></Cell>
    <Cell><Data ss:Type="Number">${view.summary.totalRecords}</Data></Cell>
   </Row>
   <Row>
    <Cell ss:StyleID="Bold"><Data ss:Type="String">Количество точек</Data></Cell>
    <Cell><Data ss:Type="Number">${view.summary.pointCount}</Data></Cell>
   </Row>
   <Row>
    <Cell ss:StyleID="Bold"><Data ss:Type="String">Количество отрезков</Data></Cell>
    <Cell><Data ss:Type="Number">${view.summary.segmentCount}</Data></Cell>
   </Row>
   <Row>
    <Cell ss:StyleID="Bold"><Data ss:Type="String">Количество окружностей</Data></Cell>
    <Cell><Data ss:Type="Number">${view.summary.circleCount}</Data></Cell>
   </Row>
   <Row>
    <Cell ss:StyleID="Bold"><Data ss:Type="String">Производные связи (хорды/дуги/углы)</Data></Cell>
    <Cell><Data ss:Type="Number">${view.summary.derivedRelationCount}</Data></Cell>
   </Row>
   <Row>
    <Cell ss:StyleID="Bold"><Data ss:Type="String">Доказанные теоремы (Q.E.D.)</Data></Cell>
    <Cell><Data ss:Type="Number">${view.summary.verifiedTheoremCount}</Data></Cell>
   </Row>
   <Row>
    <Cell ss:StyleID="Bold"><Data ss:Type="String">Максимальная топологическая глубина</Data></Cell>
    <Cell><Data ss:Type="Number">${view.summary.maxTopologicalDepth}</Data></Cell>
   </Row>
  </Table>
 </Worksheet>

 <!-- 2. РЕЕСТР СУЩНОСТЕЙ -->
 <Worksheet ss:Name="Реестр сущностей">
  <Table>
   <Column ss:Width="90"/>
   <Column ss:Width="160"/>
   <Column ss:Width="110"/>
   <Column ss:Width="130"/>
   <Column ss:Width="70"/>
   <Column ss:Width="100"/>
   <Column ss:Width="100"/>
   <Column ss:Width="200"/>
   <Column ss:Width="130"/>
   <Column ss:Width="70"/>
   <Column ss:Width="140"/>
   <Column ss:Width="280"/>
   <Row>
    <Cell ss:StyleID="Header"><Data ss:Type="String">ID</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Название</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Тип</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Категория</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Глубина</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Родители</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Потомки</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Метрики</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Статус</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Q.E.D.</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Теорема</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Обоснование / Провенанс</Data></Cell>
   </Row>
   ${view.records
     .map((rec) => {
       const metricsStr = Object.entries(rec.metrics)
         .map(([k, v]) => `${k}:${v}`)
         .join('; ');
       const qedStyle = rec.isProven ? 'BadgeProven' : 'BadgeHypothesis';
       return `<Row>
    <Cell><Data ss:Type="String">${escapeXml(rec.id)}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(rec.name)}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(rec.kind)}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(rec.category)}</Data></Cell>
    <Cell><Data ss:Type="Number">${rec.depth}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(rec.parentIds.join(', '))}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(rec.childIds.join(', '))}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(metricsStr)}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(rec.epistemicStatus)}</Data></Cell>
    <Cell ss:StyleID="${qedStyle}"><Data ss:Type="String">${rec.isProven ? 'Да' : 'Нет'}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(rec.theoremId || '')}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(rec.provenanceNote || '')}</Data></Cell>
   </Row>`;
     })
     .join('\n   ')}
  </Table>
 </Worksheet>

 <!-- 3. ТОПОЛОГИЯ DAG -->
 <Worksheet ss:Name="Топологический граф">
  <Table>
   <Column ss:Width="160"/>
   <Column ss:Width="140"/>
   <Column ss:Width="140"/>
   <Column ss:Width="140"/>
   <Row>
    <Cell ss:StyleID="Header"><Data ss:Type="String">ID связи</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Родитель (Source)</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Потомок (Target)</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Тип отношения</Data></Cell>
   </Row>
   ${view.topology.edges
     .map(
       (e) => `<Row>
    <Cell><Data ss:Type="String">${escapeXml(e.id)}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(e.sourceId)}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(e.targetId)}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(e.relation)}</Data></Cell>
   </Row>`
     )
     .join('\n   ')}
  </Table>
 </Worksheet>

 <!-- 4. ЭПИСТЕМИЧЕСКИЙ РЕЕСТР -->
 <Worksheet ss:Name="Эпистемический реестр">
  <Table>
   <Column ss:Width="120"/>
   <Column ss:Width="220"/>
   <Column ss:Width="130"/>
   <Column ss:Width="80"/>
   <Column ss:Width="220"/>
   <Column ss:Width="300"/>
   <Row>
    <Cell ss:StyleID="Header"><Data ss:Type="String">ID сущности</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Заголовок</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Эпистемический статус</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Q.E.D.</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Формула / Правило</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Основание</Data></Cell>
   </Row>
   ${view.epistemicRegistry
     .map(
       (entry) => `<Row>
    <Cell><Data ss:Type="String">${escapeXml(entry.entityId)}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(entry.title)}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(entry.status)}</Data></Cell>
    <Cell ss:StyleID="${entry.isProven ? 'BadgeProven' : 'BadgeHypothesis'}"><Data ss:Type="String">${entry.isProven ? 'Да' : 'Нет'}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(entry.formula)}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(entry.basis)}</Data></Cell>
   </Row>`
     )
     .join('\n   ')}
  </Table>
 </Worksheet>
</Workbook>`;
  return xml;
}
