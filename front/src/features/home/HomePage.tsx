import { HomePseudo } from './HomePseudo';
import { KitchenPreview } from './KitchenPreview';
import { LevelPicker } from './LevelPicker';
import { isLocalDemo } from '../game/localDemo';
import { useState } from 'react';
import { getServiceRules } from '@chopchop/shared';
import { readSelectedLevel } from '../game/levelSelection';
import s from './Selection.module.scss';

const chefs = ['Miso','Pipa','Basile','Alba','Nori','Gaspard'];
export function HomePage() {
  const [level, setLevel] = useState(readSelectedLevel);
  const rules = getServiceRules(level);
  const [chef, setChef] = useState(() => Math.max(0, chefs.indexOf(sessionStorage.getItem('chef') ?? '')));
  function select(index: number) {
    const next = (index + chefs.length) % chefs.length;
    setChef(next); sessionStorage.setItem('chef', chefs[next]!);
  }
  return <main className={s.menu}>
    <h1><img src="/menu/logo.png" alt="CHOP CHOP" /></h1>
    <div className={s.columns}>
      <section className={s.level}>
        <LevelPicker value={level} onChange={next => { setLevel(next); sessionStorage.setItem('level', String(next)); }} />
        <h2>0{level} / {level === 1 ? 'PREMIER COUP DE FEU' : level === 2 ? 'CHAUD DEVANT' : 'LE GRAND WRAP'} <time>03:00</time></h2>
        <KitchenPreview level={level} chef={chefs[chef]!} />
          <div className={s.stars}>{rules.stars.map((score,i)=><div key={score}><span aria-label={`${i+1} étoiles`}>{Array.from({length:i+1},(_,j)=><img key={j} src="/menu/star.svg" alt="" />)}</span>{score.toLocaleString('fr-FR')} pts</div>)}</div>
      </section>
      <section className={s.selection}>
        <HomePseudo />
        <h2>CHOISIS TON CHEF</h2><h3 aria-live="polite">{chefs[chef]!.toUpperCase()}</h3>
        <div className={s.carousel}><button aria-label="Chef précédent" onClick={()=>select(chef-1)}>&lt;</button><img src={`/menu/${chefs[chef]}.png`} alt={chefs[chef]} /><button aria-label="Chef suivant" onClick={()=>select(chef+1)}>&gt;</button></div>
        <div className={s.thumbs}>{chefs.map((c,i)=><button key={c} aria-label={c} aria-pressed={i===chef} onClick={()=>select(i)}><img src={`/menu/${c}.png`} alt="" /></button>)}</div>
        <small>{chef+1} / 6 CHEFS</small>
      </section>
    </div>
    <nav className={s.actions} aria-label="Menu principal"><a href="#jouer">JOUER</a><a href="#regles">COMMENT JOUER</a><a href="#classement">CLASSEMENT</a></nav>
    <footer>{isLocalDemo() ? "ESSAI LOCAL · Sans compte · Scores dans cet onglet uniquement" : "CHOP CHOP · Projet étudiant · 2026"}</footer>
  </main>;
}
