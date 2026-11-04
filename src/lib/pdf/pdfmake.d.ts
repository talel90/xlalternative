declare module 'pdfmake/build/pdfmake.js' {
	interface PdfMakeStatic {
		addVirtualFileSystem(vfs: unknown): void;
		createPdf(definition: unknown): { download(nomFichier?: string): void };
	}
	const pdfMake: PdfMakeStatic;
	export default pdfMake;
}

declare module 'pdfmake/build/vfs_fonts.js' {
	const vfs: unknown;
	export default vfs;
}
