import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import {Backlog} from '../project/backlog';
import {Metric, Milestones, Section} from '../project/components';
import {Assignment, Checks, DelayExamples, LabelBreakdown, ReviewMetrics} from '../project/evidence';
import {issueUrl, pullUrl, snapshot, syncedAt} from '../project/data';
import styles from '../project/project.module.css';

export default function ProjectSummary() {
  return <Layout title="Bilan de projet" description="Synthèse CHOP-CHOP pour la soutenance.">
    <main className={`${styles.main} ${styles.summary}`}>
      <header className={styles.hero}>
        <h1>Bilan de projet</h1>
        <p>CHOP-CHOP, un jeu de cuisine solo au clavier. Le parcours cible relie le choix du pseudo,
          le service, les résultats et le classement pour chacun des trois niveaux.</p>
        <small>Chiffres synchronisés le {syncedAt} · heure de Paris</small>
        <div className={styles.links}>
          <Link to="/gestion-de-projet">Revenir au tableau de bord</Link>
          <button type="button" className={styles.action} onClick={() => window.print()}>Imprimer / enregistrer en PDF</button>
        </div>
      </header>
      <nav className={`${styles.jump} ${styles.links}`} aria-label="Parcours de soutenance">
        <a href="#organisation">Organisation</a><a href="#travail-suivi">Répartition</a><a href="#delais">Délais</a><a href="#reste">Travail restant</a>
        <a href="#validation">Démonstration</a>
      </nav>
      <Section id="organisation" title="Comment l’équipe s’est organisée">
        <p>Sabrina coordonne le projet et contribue au développement, Maxence intervient sur le front et l’UX,
          Valérie sur la base de données et le back-end, et Mel sur le back-end. Les responsabilités détaillées figurent sur la
          {' '}<Link to="/docs/equipe">page de l’équipe</Link>.</p>
        <div className={styles.metricGrid}>
          <Metric label="Issues du dépôt" value={snapshot.issues.length} note={`${snapshot.issues.filter(({closed}) => closed).length} fermées`} />
          <Metric label="PR fusionnées" value={snapshot.pulls.filter(({merged}) => merged).length} note={`Sur ${snapshot.pulls.length} PR`} />
          <Metric label="Commits accessibles depuis main" value={snapshot.commits.length} note="Activité du dépôt" />
        </div>
      </Section>
      <Section id="travail-suivi" title="Le travail suivi dans GitHub">
        <div className={styles.two}>
          <div className={styles.panel}>
            <h3>Issues par label GitHub</h3>
            <LabelBreakdown issues={snapshot.issues} pulls={snapshot.pulls} compact />
            <p><Link to="/gestion-de-projet#labels">Voir le catalogue complet et filtrer</Link></p>
          </div>
          <div className={styles.panel}>
            <h3>Répartition des issues</h3>
            <Assignment issues={snapshot.issues} />
            <h3>Vérifications automatisées</h3>
            <Checks />
          </div>
        </div>
      </Section>
      <Section id="delais" title="Où le projet a attendu">
        <ReviewMetrics pulls={snapshot.pulls} compact />
        <DelayExamples issues={snapshot.issues} pulls={snapshot.pulls} compact />
        <p><Link to="/gestion-de-projet#flux">Consulter la chronologie des PR et des revues</Link></p>
      </Section>
      <Section id="realisations" title="Du cadrage à l’intégration"><Milestones /></Section>
      <Section id="validation" title="Ce que l’équipe peut démontrer">
        <ul>
          <li><strong>Intégré au dépôt.</strong> La cuisine Phaser, les interactions, le profil joueur et l’interface du classement.
            {' '}<a href={pullUrl(39)}>Interactions</a> · <a href={pullUrl(36)}>Profil</a> · <a href={pullUrl(52)}>Classement</a></li>
          <li><strong>Vérifié sur un service déployé.</strong> Le rapport de contrôle Render et Supabase est consigné dans
            {' '}<a href={pullUrl(84)}>la PR #84</a>.</li>
          <li><strong>Test local rapporté.</strong> Jeu et règles des trois niveaux regroupés dans <a href={issueUrl(85)}>l’issue #85</a>,
            avec l’essai de Maxence encore indiqué comme attendu.</li>
          <li><strong>Recette finale.</strong> Le raccordement du front déployé à l’API et la validation des trois parcours
            sont suivis dans <a href={issueUrl(50)}>#50</a> et <a href={issueUrl(72)}>#72</a>.</li>
        </ul>
      </Section>
      <Section id="reste" title="Travail restant"><Backlog issues={snapshot.issues} compact /></Section>
      <Section id="suite" title="Priorités pour la démonstration">
        <p>Tester le parcours du pseudo au score retrouvé dans le classement, puis reproduire la recette sur les trois niveaux avec les services réels.
          Vérifier aussi les cas de pause et d’abandon.</p>
        <p>Consigner les résultats dans <a href={issueUrl(72)}>l’issue de recette</a> et actualiser
          {' '}<Link to="/docs/validation">la page de validation</Link> avec la version testée.</p>
      </Section>
    </main>
  </Layout>;
}
