<script lang="ts">
	import { goto } from '$app/navigation';
	import { creerMarche, montantVersMillimes } from '$lib/db/depots';
	import { importerDepuisTexte, lignesVersArticles, detecterColonnes, type ResultatImport, type LigneBrute } from '$lib/import/bordereau';
	import { controlerMontantMarche } from '$lib/core/controles';
	import { formatDecimal } from '$lib/core/nombres';

	let numero = $state('');
	let lot = $state('');
	let intitule = $state('');
	let maitreOuvrage = $state('');
	let commissariat = $state('');
	let dateApprobation = $state('');
	let gestion = $state('');
	let montantTTC = $state('');
	let texteColle = $state('');
	let resultat = $state<ResultatImport | null>(null);
	let erreurGlobale = $state('');
	let controle = $state<ReturnType<typeof controlerMontantMarche> | null>(null);
	let enregistrement = $state(false);

	/** Analyse un texte collé ou un fichier Excel, puis affiche l'aperçu et le contrôle. */
	function analyser(lignes: LigneBrute[] | null) {
		erreurGlobale = '';
		controle = null;
		const colonnes = lignes ? detecterColonnes(lignes) : null;
		if (!lignes || !colonnes) {
			resultat = null;
			erreurGlobale = "En-tête introuvable : il faut une colonne Désignation, Quantité et Prix.";
			return;
		}
		resultat = lignesVersArticles(lignes, colonnes);
		verifierMontant();
	}

	function analyserTexte() {
		const r = importerDepuisTexte(texteColle);
		if ('erreur' in r) {
			resultat = null;
			erreurGlobale = r.erreur;
			return;
		}
		resultat = r;
		verifierMontant();
	}

	async function analyserFichier(e: Event) {
		const fichier = (e.target as HTMLInputElement).files?.[0];
		if (!fichier) return;
		const { lireFichierExcel } = await import('$lib/import/excel');
		analyser(await lireFichierExcel(fichier));
	}

	function verifierMontant() {
		if (!resultat || montantTTC.trim() === '') return;
		try {
			controle = controlerMontantMarche(resultat.articles, montantVersMillimes(montantTTC));
		} catch {
			controle = null;
		}
	}

	async function enregistrer() {
		if (!resultat) return;
		enregistrement = true;
		try {
			await creerMarche(
				{
					numero: numero.trim(),
					lot: lot.trim(),
					intitule: intitule.trim(),
					maitreOuvrage: maitreOuvrage.trim(),
					commissariat: commissariat.trim(),
					dateApprobation: dateApprobation.trim(),
					montantMarcheTTC: montantVersMillimes(montantTTC).toString(),
					tauxTVA: 19,
					tauxRetenue: 5,
					gestion: gestion.trim(),
				},
				resultat.articles,
			);
			await goto('/');
		} finally {
			enregistrement = false;
		}
	}
</script>

<h1>Nouveau marché</h1>

<h2>1. Informations du marché</h2>
<div class="grille">
	<label>N° du marché <input bind:value={numero} oninput={verifierMontant} required /></label>
	<label>Lot <input bind:value={lot} /></label>
</div>
<label>Intitulé <input bind:value={intitule} required /></label>
<label>Maître d'ouvrage <input bind:value={maitreOuvrage} /></label>
<label>Commissariat régional <input bind:value={commissariat} /></label>
<div class="grille">
	<label>Date d'approbation <input bind:value={dateApprobation} placeholder="JJ/MM/AAAA" /></label>
	<label>Gestion <input bind:value={gestion} placeholder="AAAA" /></label>
</div>
<label>Montant du marché TTC (dt) <input bind:value={montantTTC} inputmode="decimal" oninput={verifierMontant} placeholder="138493,000" /></label>

<h2>2. Bordereau des prix</h2>
<p>Copiez le tableau depuis Excel ou Word (N°, Désignation, Unité, Quantité, Prix) et collez-le ici.</p>
<textarea rows="8" bind:value={texteColle} placeholder="Collez le bordereau ici"></textarea>
<button type="button" onclick={analyserTexte} disabled={texteColle.trim() === ''}>Analyser le texte</button>

<p>Ou importez un fichier Excel :</p>
<input type="file" accept=".xlsx,.xls" onchange={analyserFichier} />

{#if erreurGlobale}<p class="erreur">{erreurGlobale}</p>{/if}

{#if resultat}
	<h2>3. Vérification</h2>
	<p>{resultat.articles.length} article(s) reconnu(s).</p>

	{#if resultat.erreurs.length > 0}
		<ul class="erreur">
			{#each resultat.erreurs as e (e.ligneSource)}
				<li>Ligne {e.ligneSource} : {e.message}</li>
			{/each}
		</ul>
	{/if}

	<table>
		<thead>
			<tr><th>Code</th><th>Désignation</th><th>U</th><th>Qté prévue</th><th>PU HT</th></tr>
		</thead>
		<tbody>
			{#each resultat.articles as a (a.ligneSource)}
				<tr>
					<td>{a.code}</td>
					<td>{a.designation}</td>
					<td>{a.unite}</td>
					<td>{formatDecimal(a.qtePrevue)}</td>
					<td>{formatDecimal(a.puHT)}</td>
				</tr>
			{/each}
		</tbody>
	</table>

	{#if controle}
		{#if controle.coherent}
			<p class="ok">Montant cohérent avec le bordereau.</p>
		{:else}
			<p class="erreur">
				Écart de {formatDecimal(controle.ecart)} dt entre le montant saisi et le bordereau
				({formatDecimal(controle.ttcBordereau)} dt TTC calculés). Vérifiez le bordereau ou le montant.
			</p>
		{/if}
	{/if}

	<button type="button" onclick={enregistrer} disabled={enregistrement || resultat.articles.length === 0 || numero.trim() === '' || intitule.trim() === '' || montantTTC.trim() === ''}>
		Enregistrer le marché
	</button>
{/if}

<style>
	.grille {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75rem;
	}
	h2 {
		margin-top: 1.5rem;
		font-size: 1.1rem;
	}
</style>
