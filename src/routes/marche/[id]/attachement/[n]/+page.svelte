<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { lireMarche } from '$lib/db/depots';
	import {
		ajouterLigne,
		articlesDuMarcheRecords,
		champsPourUnite,
		dupliquerLigne,
		lignesDeLAttachement,
		lireAttachement,
		lireDimension,
		listerElements,
		supprimerLigne,
		totalDUneLigne,
		totauxDuMois,
		type DonneesLigne,
	} from '$lib/db/metre-depots';
	import type {
		ArticleRecord,
		AttachementRecord,
		ElementTypeRecord,
		LigneMetreRecord,
		MarcheRecord,
	} from '$lib/db/schema';
	import { analyserFormule } from '$lib/core/elements';
	import { formatDecimal } from '$lib/core/nombres';
	import type { Champ, Unite } from '$lib/core/gabarits';
	import { peutValider, type Controle } from '$lib/core/validation';
	import { controlesDeLAttachement, validerAttachement } from '$lib/db/validation-depots';

	const libelles: Record<Champ, string> = {
		nbr: 'Nbr',
		L: 'Longueur',
		l: 'Largeur',
		h: 'Hauteur',
		kgml: 'kg/ml',
	};

	const marcheId = $derived(page.params.id ?? '');
	const numero = $derived(Number(page.params.n));

	let marche = $state<MarcheRecord | undefined>();
	let attachement = $state<AttachementRecord | undefined>();
	let articles = $state<ArticleRecord[]>([]);
	let lignes = $state<LigneMetreRecord[]>([]);
	let elements = $state<ElementTypeRecord[]>([]);
	let totaux = $state(new Map<string, bigint>());
	let controles = $state<Controle[]>([]);
	let chargement = $state(true);
	let messageErreur = $state('');
	let messageInfo = $state('');

	/** Brouillon de saisie par article : une ligne en cours de saisie. */
	let brouillons = $state<Record<string, Record<string, string>>>({});
	let formules = $state<Record<string, string>>({});

	const verrouille = $derived(attachement?.statut === 'valide');

	async function recharger() {
		marche = await lireMarche(marcheId);
		attachement = await lireAttachement(marcheId, numero);
		if (!attachement) return;
		articles = await articlesDuMarcheRecords(marcheId);
		lignes = await lignesDeLAttachement(attachement.id);
		elements = await listerElements(marcheId);
		totaux = await totauxDuMois(attachement.id, articles);
		controles = attachement.statut === 'brouillon' ? await controlesDeLAttachement(marcheId, numero) : [];
	}

	onMount(async () => {
		await recharger();
		chargement = false;
	});

	async function valider() {
		messageErreur = '';
		messageInfo = '';
		try {
			await validerAttachement(marcheId, numero);
			messageInfo = 'Attachement validé et verrouillé. Pensez à exporter une sauvegarde depuis les paramètres.';
			await recharger();
		} catch (e) {
			messageErreur = e instanceof Error ? e.message : String(e);
		}
	}

	function lignesDe(articleId: string): LigneMetreRecord[] {
		return lignes.filter((l) => l.articleId === articleId);
	}

	function brouillonDe(articleId: string): Record<string, string> {
		return brouillons[articleId] ?? {};
	}

	function majBrouillon(articleId: string, champ: string, valeur: string) {
		brouillons[articleId] = { ...brouillonDe(articleId), [champ]: valeur };
	}

	/** Construit les données d'une ligne à partir de la saisie, en champs exacts. */
	function donneesDepuisBrouillon(article: ArticleRecord, saisie: Record<string, string>): DonneesLigne {
		const champs = champsPourUnite(article.unite as Unite);
		const donnees: DonneesLigne = {
			articleId: article.id,
			libelle: saisie.libelle?.trim() ?? '',
			nbr: lireDimension(saisie.nbr ?? '1') ?? '1000',
		};
		for (const c of champs) {
			if (c === 'nbr') continue;
			const v = lireDimension(saisie[c] ?? '');
			if (v === undefined) throw new Error(`« ${libelles[c]} » est obligatoire pour ${article.unite}`);
			donnees[c] = v;
		}
		const deduire = lireDimension(saisie.aDeduire ?? '');
		if (deduire !== undefined) donnees.aDeduire = deduire;
		return donnees;
	}

	function totalBrouillon(article: ArticleRecord): string {
		try {
			return formatDecimal(totalDUneLigne(article.unite as Unite, donneesDepuisBrouillon(article, brouillonDe(article.id))));
		} catch {
			return '—';
		}
	}

	async function ajouter(article: ArticleRecord) {
		messageErreur = '';
		try {
			const donnees = donneesDepuisBrouillon(article, brouillonDe(article.id));
			if (!attachement) return;
			await ajouterLigne(attachement.id, donnees);
			brouillons[article.id] = {};
			await recharger();
		} catch (e) {
			messageErreur = e instanceof Error ? e.message : String(e);
		}
	}

	/** Saisie rapide « P1 × 24 » : remplit la ligne avec les dimensions de l'élément type. */
	async function ajouterFormule(article: ArticleRecord) {
		messageErreur = '';
		const formule = analyserFormule(formules[article.id] ?? '');
		if (!formule) {
			messageErreur = 'Formule non reconnue. Exemple : P1 × 24';
			return;
		}
		const element = elements.find((e) => e.code === formule.code);
		if (!element || !attachement) {
			messageErreur = `Élément « ${formule.code} » introuvable dans les éléments types du marché.`;
			return;
		}
		const donnees: DonneesLigne = {
			articleId: article.id,
			libelle: `${element.code} — ${element.libelle}`,
			nbr: formule.nbr.toString(),
		};
		for (const c of champsPourUnite(article.unite as Unite)) {
			if (c === 'nbr') continue;
			const v = c === 'L' ? element.L : c === 'l' ? element.l : c === 'h' ? element.h : undefined;
			if (v === undefined) {
				messageErreur = `L'élément ${element.code} n'a pas de « ${libelles[c]} » pour ${article.unite}.`;
				return;
			}
			donnees[c] = v;
		}
		try {
			await ajouterLigne(attachement.id, donnees);
			formules[article.id] = '';
			await recharger();
		} catch (e) {
			messageErreur = e instanceof Error ? e.message : String(e);
		}
	}

	async function supprimer(l: LigneMetreRecord) {
		messageErreur = '';
		try {
			await supprimerLigne(l.id);
			await recharger();
		} catch (e) {
			messageErreur = e instanceof Error ? e.message : String(e);
		}
	}

	async function dupliquer(l: LigneMetreRecord) {
		messageErreur = '';
		try {
			await dupliquerLigne(l.id);
			await recharger();
		} catch (e) {
			messageErreur = e instanceof Error ? e.message : String(e);
		}
	}

	function texteDimensions(article: ArticleRecord, l: LigneMetreRecord): string {
		return champsPourUnite(article.unite as Unite)
			.filter((c) => c !== 'nbr' && l[c] !== undefined)
			.map((c) => `${libelles[c]} ${formatDecimal(BigInt(l[c] as string))}`)
			.join(' × ');
	}

	function totalLigneTexte(article: ArticleRecord, l: LigneMetreRecord): string {
		return formatDecimal(totalDUneLigne(article.unite as Unite, l));
	}
</script>

{#if chargement}
	<p>Chargement…</p>
{:else if !marche || !attachement}
	<p class="erreur">Attachement introuvable.</p>
	<a href={`/marche/${marcheId}`}>Retour au marché</a>
{:else}
	<a href={`/marche/${marcheId}`}>← Marché N°{marche.numero}</a>
	<h1>Attachement N°{attachement.numero}</h1>
	<p class="sous">Arrêté au {attachement.dateArrete} · {attachement.statut}</p>
	<p><a href={`/marche/${marcheId}/attachement/${numero}/documents`}>Voir les documents et le PDF →</a></p>

	{#if messageErreur}<p class="erreur">{messageErreur}</p>{/if}
	{#if messageInfo}<p class="ok">{messageInfo}</p>{/if}

	{#if verrouille}
		<p class="verrou">Cet attachement est validé : il est verrouillé et ne peut plus être modifié.</p>
	{:else}
		<section class="validation">
			<h2>Validation</h2>
			{#if controles.length === 0}
				<p class="ok">Aucun contrôle en suspens.</p>
			{:else}
				{#each controles as c, i (i)}
					<p class={c.niveau === 'bloquant' ? 'erreur' : 'avert'}>
						{c.niveau === 'bloquant' ? 'Bloquant : ' : 'Attention : '}{c.message}
					</p>
				{/each}
			{/if}
			<button type="button" onclick={valider} disabled={!peutValider(controles)}>
				Valider l'attachement
			</button>
		</section>
	{/if}

	{#each articles as article (article.id)}
		{@const total = totaux.get(article.id) ?? 0n}
		<details class="article" open={lignesDe(article.id).length > 0}>
			<summary>
				<span class="code">{article.code}</span>
				{article.designation}
				<span class="unite">({article.unite})</span>
				<span class="total">{formatDecimal(total)}</span>
			</summary>

			{#each lignesDe(article.id) as l (l.id)}
				<div class="ligne">
					<div>
						<strong>{l.libelle || '—'}</strong>
						<span class="sous">Nbr {formatDecimal(BigInt(l.nbr))}{texteDimensions(article, l) ? ` · ${texteDimensions(article, l)}` : ''}</span>
					</div>
					<div class="actions">
						<span>{totalLigneTexte(article, l)}</span>
						{#if !verrouille}
							<button type="button" class="petit" onclick={() => dupliquer(l)}>Dupliquer</button>
							<button type="button" class="petit danger" onclick={() => supprimer(l)}>Supprimer</button>
						{/if}
					</div>
				</div>
			{/each}

			{#if !verrouille}
				<div class="saisie">
					<label>Formule rapide (ex. P1 × 24)
						<div class="ligne-saisie">
							<input
								value={formules[article.id] ?? ''}
								oninput={(e) => (formules[article.id] = (e.target as HTMLInputElement).value)}
								placeholder="P1 × 24"
							/>
							<button type="button" class="petit" onclick={() => ajouterFormule(article)}>Ajouter</button>
						</div>
					</label>

					<p class="sous">Ou saisie détaillée :</p>
					<label>Libellé <input value={brouillonDe(article.id).libelle ?? ''} oninput={(e) => majBrouillon(article.id, 'libelle', (e.target as HTMLInputElement).value)} /></label>
					<div class="grille">
						{#each champsPourUnite(article.unite as Unite) as c (c)}
							<label>{libelles[c]}
								<input
									inputmode="decimal"
									value={brouillonDe(article.id)[c] ?? (c === 'nbr' ? '1' : '')}
									oninput={(e) => majBrouillon(article.id, c, (e.target as HTMLInputElement).value)}
								/>
							</label>
						{/each}
						<label>À déduire
							<input inputmode="decimal" value={brouillonDe(article.id).aDeduire ?? ''} oninput={(e) => majBrouillon(article.id, 'aDeduire', (e.target as HTMLInputElement).value)} />
						</label>
					</div>
					<p class="sous">Total de cette ligne : <strong>{totalBrouillon(article)}</strong></p>
					<button type="button" onclick={() => ajouter(article)}>Ajouter la ligne</button>
				</div>
			{/if}
		</details>
	{/each}
{/if}

<style>
	.sous {
		color: #6b7280;
		font-size: 0.9rem;
	}
	.erreur {
		color: #b91c1c;
	}
	.ok {
		color: #15803d;
	}
	.avert {
		color: #b45309;
	}
	.verrou {
		background: #fef3c7;
		padding: 0.6rem;
		border-radius: 0.4rem;
	}
	.validation {
		background: #fff;
		border: 1px solid #e5e7eb;
		border-radius: 0.4rem;
		padding: 0.6rem;
		margin-top: 0.8rem;
	}
	h2 {
		font-size: 1.05rem;
		margin: 0 0 0.4rem;
	}
	.article {
		background: #fff;
		border: 1px solid #e5e7eb;
		border-radius: 0.4rem;
		padding: 0.6rem;
		margin-top: 0.6rem;
	}
	summary {
		cursor: pointer;
		font-weight: 600;
	}
	.code {
		display: inline-block;
		min-width: 2.5rem;
		color: #1e3a8a;
	}
	.unite {
		color: #6b7280;
		font-weight: normal;
	}
	.total {
		float: right;
	}
	.ligne {
		display: flex;
		justify-content: space-between;
		gap: 0.5rem;
		border-top: 1px solid #e5e7eb;
		padding: 0.5rem 0;
	}
	.actions {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		white-space: nowrap;
	}
	.saisie {
		margin-top: 0.8rem;
		border-top: 1px dashed #d1d5db;
		padding-top: 0.5rem;
	}
	.grille {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.5rem;
	}
	.ligne-saisie {
		display: flex;
		gap: 0.4rem;
	}
	.petit {
		margin-top: 0 !important;
		padding: 0.3rem 0.6rem !important;
		font-size: 0.85rem !important;
	}
	.danger {
		background: #b91c1c !important;
	}
</style>
