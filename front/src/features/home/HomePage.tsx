import { useState } from 'react';
import { getServiceRules, type ServiceLevel } from '@chopchop/shared';
import { readSelectedLevel } from '../game/levelSelection';
import s from './Selection.module.scss';

const chefs = ['Miso','Pipa','Basile','Alba','Nori','Gaspard'];
export function HomePage() {
  const [level, setLevel] = useState(readSelectedLevel);
  const rules = getServiceRules(level);
  const [chef, setChef] = useState(() => Math.max(0, chefs.indexOf(sessionStorage.getItem('chef') ?? '')));
  const [name, setName] = useState(() => sessionStorage.getItem('pseudo') ?? '');
  function select(index: number) {
    const next = (index + chefs.length) % chefs.length;
    setChef(next); sessionStorage.setItem('chef', chefs[next]!);
  }
  return <main className={s.menu}>
    <h1><img src="/menu/logo.png" alt="CHOP CHOP" /></h1>
    <div className={s.columns}>
      <section className={s.level}>
        <label htmlFor="service-level">CHOISIS TON NIVEAU </label>
        <select id="service-level" value={level} onChange={event => {
          const next = Number(event.target.value) as ServiceLevel; setLevel(next); sessionStorage.setItem('level', String(next));
        }}><option value="1">1 · Tomate et viande</option><option value="2">2 · Salade et incendies</option></select>
        <h2>0{level} / {level === 1 ? 'PREMIER COUP DE FEU' : 'CHAUD DEVANT'} <time>03:00</time></h2>
        <img className={s.map} src="/menu/kitchen.png" alt="Aperçu de la cuisine du premier service" />
          <div className={s.stars}>{rules.stars.map((score,i)=><div key={score}><span aria-label={`${i+1} étoiles`}>{Array.from({length:i+1},(_,j)=><img key={j} src="/menu/star.svg" alt="" />)}</span>{score.toLocaleString('fr-FR')} pts</div>)}</div>
      </section>
      <section className={s.selection}>
        <label>Ton prénom ou pseudo<input placeholder="Ex. Alex" value={name} maxLength={16} onChange={e=>{setName(e.target.value);sessionStorage.setItem('pseudo',e.target.value);}} /></label>
        <h2>CHOISIS TON CHEF</h2><h3 aria-live="polite">{chefs[chef]!.toUpperCase()}</h3>
        <div className={s.carousel}><button aria-label="Chef précédent" onClick={()=>select(chef-1)}>&lt;</button><img src={`/menu/${chefs[chef]}.png`} alt={chefs[chef]} /><button aria-label="Chef suivant" onClick={()=>select(chef+1)}>&gt;</button></div>
        <div className={s.thumbs}>{chefs.map((c,i)=><button key={c} aria-label={c} aria-pressed={i===chef} onClick={()=>select(i)}><img src={`/menu/${c}.png`} alt="" /></button>)}</div>
        <small>{chef+1} / 6 CHEFS</small>
      </section>
    </div>
    <nav className={s.actions} aria-label="Menu principal"><a href="#jouer">JOUER</a><a href="#regles">COMMENT JOUER</a><a href="#classement">CLASSEMENT</a></nav>
    <footer>CHOP CHOP · Projet étudiant · 2026</footer>
  </main>;
}
