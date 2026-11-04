/**
 * Génère et télécharge un PDF. pdfmake et ses polices ne sont chargés qu'au moment de l'export,
 * puis mis en cache par le service worker : l'export fonctionne ensuite hors ligne.
 */
export async function telechargerPdf(definition: Record<string, unknown>, nomFichier: string): Promise<void> {
	const [{ default: pdfMake }, { default: vfs }] = await Promise.all([
		import('pdfmake/build/pdfmake.js'),
		import('pdfmake/build/vfs_fonts.js'),
	]);
	pdfMake.addVirtualFileSystem(vfs);
	pdfMake.createPdf(definition).download(nomFichier);
}
