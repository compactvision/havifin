export interface XlsxSheet {
    /** Sheet tab name - truncated to Excel's 31-char limit. */
    name: string;
    /** First row is treated as the header (bold, frozen). */
    rows: (string | number | null | undefined)[][];
    /** Optional column widths, in characters, matching row order. */
    columnWidths?: number[];
}

/**
 * Builds and downloads a .xlsx workbook entirely in the browser - no
 * server round trip, same trust boundary as the CSV export it replaces.
 * exceljs is ~930KB, so it's dynamically imported here rather than at the
 * top of this module - pages that merely offer an export button shouldn't
 * pay that weight until someone actually clicks it.
 */
export async function exportToXlsx(filename: string, sheets: XlsxSheet[]) {
    const { default: ExcelJS } = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Havifin';
    workbook.created = new Date();

    for (const sheet of sheets) {
        const worksheet = workbook.addWorksheet(sheet.name.slice(0, 31));
        worksheet.addRows(sheet.rows);

        const headerRow = worksheet.getRow(1);
        headerRow.font = { bold: true };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE2E8F0' },
        };
        worksheet.views = [{ state: 'frozen', ySplit: 1 }];

        if (sheet.columnWidths) {
            sheet.columnWidths.forEach((width, index) => {
                const column = worksheet.getColumn(index + 1);
                column.width = width;
            });
        } else {
            worksheet.columns.forEach((column) => {
                let maxLength = 10;
                column.eachCell?.({ includeEmpty: false }, (cell) => {
                    const length = String(cell.value ?? '').length;
                    if (length > maxLength) maxLength = length;
                });
                column.width = Math.min(maxLength + 2, 40);
            });
        }
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const url = URL.createObjectURL(
        new Blob([buffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
}
