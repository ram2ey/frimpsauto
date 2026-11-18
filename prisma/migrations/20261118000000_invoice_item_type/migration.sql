-- Free-form invoice lines that are not linked to inventory (e.g. parts bought from outside suppliers).
ALTER TYPE "InvoiceItemType" ADD VALUE 'ITEM';
