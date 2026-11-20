import {Canvas,useFrame,ThreeEvent,useThree} from '@react-three/fiber';
import {useEffect,useMemo,useRef,useState,memo} from 'react';
import * as THREE from 'three';
import type {Group} from 'three';
import {chapterTheme,type Challenge,type GameMode,type ChapterTheme} from './rules';
import type {BuildingId} from './buildings';

type V3=[number,number,number];
export type InputVector={x:number;z:number;dash:boolean};
export type Encounter=Challenge|'neighbor1'|'neighbor2';
export type WalkRequest={kind:Encounter;serial:number};
export type WorldProps={
 week:number;mode:GameMode;round:number;active:boolean;reduced:boolean;power:number;foundSeeds:boolean[];avatarLevel:number;placedDecorations:string[];
 requestedDestination:WalkRequest|null;
 inputs:React.RefObject<InputVector>;onEnter:(type:Encounter)=>void;onCollect:(index:number)=>void;onSeed:(index:number)=>void;
 onNearby:(kind:Encounter|null)=>void;onPosition:(x:number,z:number)=>void;
};
type WalkTarget={x:number;z:number;radius:number;kind:'encounter'|'seed'|'answer'|'walk';value:Encounter|number|null};
type PropShape={pos:V3;color:string;size?:V3};
type CreatureKind='fox'|'bunny'|'owl'|'bear'|'otter'|'bird'|'hedgehog'|'mouse'|'panda'|'lynx';
const chapterCreature:CreatureKind[]=['fox','bunny','bear','otter','fox','owl','bird','hedgehog','mouse','panda','lynx'];
const chapterCreatureColor=['#d9a079','#ecccb5','#a99581','#b79c83','#b9a884','#b7a2a9','#b7c3c9','#b39c83','#b5aab7','#c68b75','#c7af94'];
const PORTALS:Record<Challenge,{x:number;z:number;color:string;label:string}> = {
 word:{x:-3.4,z:-2.05,color:'#ebada5',label:'A'},story:{x:3.4,z:-2.05,color:'#f1c88f',label:'B'},
 debate:{x:-3.4,z:1.48,color:'#a6a9db',label:'C'},voice:{x:3.4,z:1.48,color:'#92ced0',label:'D'}
};
const ANSWERS:[number,number][]=[[-2.5,-1.4],[0,-2.4],[2.5,-1.4]];
const SEED_POSITIONS:[number,number][]=[[-2.25,2.35],[-.55,-1.5],[.75,2.38],[1.8,-.75],[-2.35,-.95]];
const NEIGHBORS:Record<'neighbor1'|'neighbor2',{x:number;z:number}>={neighbor1:{x:-1.45,z:1.4},neighbor2:{x:1.5,z:-2.8}};
const mat=(color:string)=>({color,roughness:.88,metalness:0,flatShading:true});
function Orb({pos,color,size=[1,1,1]}:PropShape){return <mesh position={pos} scale={size} castShadow receiveShadow><sphereGeometry args={[1,14,10]}/><meshStandardMaterial {...mat(color)}/></mesh>}
function Block({pos,color,size=[1,1,1],rot=0}:{pos:V3;color:string;size?:V3;rot?:number}){return <mesh position={pos} rotation={[0,rot,0]} castShadow receiveShadow><boxGeometry args={size}/><meshStandardMaterial {...mat(color)}/></mesh>}
function Post({pos,color,height=.8}:{pos:V3;color:string;height?:number}){return <mesh position={pos} castShadow><cylinderGeometry args={[.12,.19,height,8]}/><meshStandardMaterial {...mat(color)}/></mesh>}
function Cone({pos,color,r=.6,h=1.2}:{pos:V3;color:string;r?:number;h?:number}){return <mesh position={pos} castShadow><coneGeometry args={[r,h,8]}/><meshStandardMaterial {...mat(color)}/></mesh>}
function Rune({text,color='#fff6db',scale=1,position=[0,0,0]}:{text:string;color?:string;scale?:number;position?:V3}){
 const texture=useMemo(()=>{
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;
  const ctx=canvas.getContext('2d')!;
  ctx.clearRect(0,0,256,256);
  ctx.fillStyle='rgba(25,63,60,.88)';ctx.beginPath();ctx.roundRect(18,18,220,220,50);ctx.fill();
  ctx.strokeStyle='rgba(253,235,174,.85)';ctx.lineWidth=8;ctx.beginPath();ctx.roundRect(25,25,206,206,44);ctx.stroke();
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=color;ctx.font='bold 158px "Segoe UI",Arial,sans-serif';ctx.fillText(text,128,139);
  const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;return t;
 },[text,color]);
 useEffect(()=>()=>texture.dispose(),[texture]);
 return <mesh position={position} scale={scale}><planeGeometry args={[.9,.9]}/><meshBasicMaterial map={texture} transparent depthWrite={false} side={THREE.DoubleSide}/></mesh>;
}
function Tree({x,z,foliage,index}:{x:number;z:number;foliage:string;index:number}){
 const h=1.15+(index%4)*.18;
 return <group position={[x,0,z]}>
  <Post pos={[0,h*.38,0]} color="#8b7156" height={h*.73}/>
  <Orb pos={[0,h+.12,0]} color={foliage} size={[.56,h*.42,.49]}/>
  <Orb pos={[-.28,h-.05,.16]} color={index%3===0?'#bdd1a3':'#83ad8f'} size={[.45,.42,.42]}/>
  <Orb pos={[.24,h+.18,-.17]} color={index%4===0?'#e8c5ba':foliage} size={[.38,.47,.39]}/>
 </group>;
}
function Wildlife({kind='fox',pos,heading=0,color,anim}:{kind?:CreatureKind;pos:V3;heading?:number;color:string;anim?:React.RefObject<{t:number;moving:boolean}>}){
 const body=useRef<Group>(null),left=useRef<Group>(null),right=useRef<Group>(null);
 useFrame(({clock})=>{
  const t=clock.getElapsedTime();const walk=Boolean(anim?.current.moving);
  if(body.current)body.current.position.y=pos[1]+(walk?Math.abs(Math.sin(t*11))*.045:Math.sin(t*1.5)*.024);
  const swing=walk?Math.sin(t*12)*.4:0;
  if(left.current)left.current.rotation.x=swing;
  if(right.current)right.current.rotation.x=-swing;
 });
 return <group ref={body} position={pos} rotation={[0,heading,0]}>
  <Orb pos={[0,.42,0]} color={color} size={[.35,.46,.3]}/>
  <Orb pos={[0,.96,.03]} color={color} size={[.44,.39,.39]}/>
  <Orb pos={[0,.84,.35]} color={kind==='panda'?'#f9eedc':'#fff0d5'} size={[.31,.23,.12]}/>
  {['fox','owl','lynx'].includes(kind)?<><Cone pos={[-.28,1.24,.01]} color={kind==='fox'?'#a77966':'#917c85'} r={.18} h={.42}/><Cone pos={[.28,1.24,.01]} color={kind==='fox'?'#a77966':'#917c85'} r={.18} h={.42}/></>:kind==='bunny'?<><Orb pos={[-.23,1.41,-.03]} color={color} size={[.13,.45,.14]}/><Orb pos={[.23,1.41,-.03]} color={color} size={[.13,.45,.14]}/></>:<><Orb pos={[-.32,1.2,0]} color={kind==='panda'?'#675764':color} size={[kind==='mouse'?.24:.19,.2,.2]}/><Orb pos={[.32,1.2,0]} color={kind==='panda'?'#675764':color} size={[kind==='mouse'?.24:.19,.2,.2]}/></>}
  <Orb pos={[-.18,.99,.365]} color="#273c43" size={[.063,.084,.031]}/><Orb pos={[.18,.99,.365]} color="#273c43" size={[.063,.084,.031]}/>
  <Orb pos={[-.157,1.03,.396]} color="#fff" size={[.017,.021,.01]}/><Orb pos={[.203,1.03,.396]} color="#fff" size={[.017,.021,.01]}/>
  <Orb pos={[0,.86,.467]} color="#b76f63" size={[.055,.044,.035]}/>
  {kind==='bird'&&<><Cone pos={[0,.87,.49]} color="#d8b676" r={.095} h={.24}/><Orb pos={[-.33,.57,0]} size={[.15,.3,.31]} color="#e8d8b7"/><Orb pos={[.33,.57,0]} size={[.15,.3,.31]} color="#e8d8b7"/></>}
  {kind==='hedgehog'&&Array.from({length:6},(_,i)=>{
    const a=i*Math.PI*2/6;
    return <Cone key={i} pos={[Math.sin(a)*.27,.62,Math.cos(a)*.26-.2]} color="#8a796a" r={.16} h={.55}/>;
  })}
  {kind==='panda'&&<><Orb pos={[-.18,1,.365]} size={[.11,.11,.03]} color="#5c5762"/><Orb pos={[.18,1,.365]} size={[.11,.11,.03]} color="#5c5762"/></>}
  <group ref={left}><Orb pos={[-.17,.12,.1]} color={color} size={[.18,.19,.2]}/></group>
  <group ref={right}><Orb pos={[.17,.12,.1]} color={color} size={[.18,.19,.2]}/></group>
  {kind==='fox'&&<Orb pos={[.37,.28,-.3]} color="#e9bb80" size={[.21,.23,.5]}/>}
  {kind==='otter'&&<Orb pos={[.28,.29,-.46]} color="#a58f79" size={[.12,.16,.58]}/>}
  {kind==='mouse'&&<Orb pos={[.22,.27,-.38]} color="#d1aaac" size={[.09,.11,.52]}/>}
  {kind==='lynx'&&<Orb pos={[.25,.25,-.28]} color="#ebd3ae" size={[.17,.14,.2]}/>}
 </group>;
}
function Portal({kind,near,onApproach}:{kind:Challenge;near:boolean;onApproach:(kind:Challenge)=>void}){
 const portal=PORTALS[kind];
 const rune=useRef<Group>(null);
 useFrame(({clock})=>{if(rune.current)rune.current.position.y=1.51+.09*Math.sin(clock.getElapsedTime()*1.9+portal.x)});
 return <group position={[portal.x,0,portal.z]} onClick={(e:ThreeEvent<MouseEvent>)=>{e.stopPropagation();onApproach(kind)}}>
  <mesh rotation={[-Math.PI/2,0,0]} position={[0,.07,0]}>
    <torusGeometry args={[.82,.13,7,28]}/><meshStandardMaterial color={portal.color} roughness={.6} emissive={near?portal.color:'#111111'} emissiveIntensity={near?.3:0}/>
  </mesh>
  <mesh position={[0,.04,0]} receiveShadow><cylinderGeometry args={[.68,.77,.14,16]}/><meshStandardMaterial color={near?'#f4e0ba':'#dbd1b2'} roughness={1}/></mesh>
  <Post pos={[-.62,.56,-.1]} height={.97} color="#a98770"/>
  <Post pos={[.62,.56,-.1]} height={.97} color="#a98770"/>
  <Block pos={[0,1.07,-.1]} color={portal.color} size={[1.52,.26,.32]}/>
  <group ref={rune} position={[0,1.51,0]}><Rune text={portal.label} color="#fff6e9"/></group>
  <Orb pos={[.66,.8,0]} color={portal.color} size={[.16,.16,.16]}/>
  <Orb pos={[-.66,.8,0]} color={portal.color} size={[.16,.16,.16]}/>
 </group>;
}
function WordSeed({index,pos,onApproach,color}:{index:number;pos:[number,number];onApproach:(index:number)=>void;color:string}){
 const glow=useRef<Group>(null);
 useFrame(({clock})=>{if(glow.current){glow.current.position.y=.59+Math.sin(clock.getElapsedTime()*1.7+index*2)*.12;glow.current.rotation.y=clock.getElapsedTime()*.5}});
 return <group position={[pos[0],0,pos[1]]} onClick={(e:ThreeEvent<MouseEvent>)=>{e.stopPropagation();onApproach(index)}}>
  <mesh rotation={[-Math.PI/2,0,0]} position={[0,.07,0]}><torusGeometry args={[.47,.055,7,20]}/><meshStandardMaterial color="#f4dd96"/></mesh>
  <group ref={glow} position={[0,.59,0]}><Orb pos={[0,0,0]} color={color} size={[.28,.37,.25]}/><Rune text={String(index+1)} position={[0,0,.25]} scale={.56}/></group>
 </group>;
}
function Landmark({specialty,accent,night}:{specialty:string;accent:string;night:boolean}){
 return <group position={[0,0,-4.8]}>
  <mesh position={[0,.12,0]} receiveShadow><cylinderGeometry args={[1.15,1.34,.27,12]}/><meshStandardMaterial color="#e7d1b0" roughness={1}/></mesh>
  {specialty==='books'&&<><Block pos={[0,.8,0]} size={[1.3,1.15,.96]} color="#dfb899"/><Block pos={[0,1.45,0]} size={[1.65,.3,1.4]} color={accent}/><Block pos={[-.33,2.05,0]} size={[.22,.8,.56]} color="#7799aa"/><Block pos={[0,2.1,0]} size={[.2,.91,.56]} color="#e2dfae"/><Block pos={[.32,1.99,0]} size={[.24,.73,.56]} color="#d99e99"/></>}
  {specialty==='cinema'&&<><Block pos={[0,1.36,0]} size={[2.5,1.6,.2]} color="#354061"/><Block pos={[0,1.36,.15]} size={[2.1,1.26,.05]} color="#eee0c0"/><Rune position={[0,1.33,.21]} text="★" scale={.85}/><Cone pos={[-1.25,1.75,-.1]} color={accent} r={.34} h={.82}/><Cone pos={[1.25,1.75,-.1]} color={accent} r={.34} h={.82}/></>}
  {specialty==='rocks'&&<>{[[-.6,.46,0],[.52,.63,0],[0,.9,-.36]].map((p,i)=><mesh key={i} position={p as V3} castShadow><dodecahedronGeometry args={[.62+i*.07,0]}/><meshStandardMaterial color={i===1?accent:'#ae9b88'} flatShading roughness={1}/></mesh>)}</>}
  {specialty==='ponds'&&<><Orb pos={[0,.12,0]} size={[1.25,.08,.8]} color="#71bbc4"/><Orb pos={[-.25,.2,0]} size={[.34,.05,.2]} color="#a3bc79"/><Post pos={[.5,.7,-.15]} color="#b29b7b"/><Orb pos={[.5,1.09,-.15]} size={[.38,.38,.36]} color="#efb2c0"/></>}
  {specialty==='sails'&&<><Block pos={[0,.38,0]} size={[2,.3,.73]} color="#b18d74"/><Post pos={[0,1.4,0]} color="#9a8c75" height={2.45}/><mesh position={[.44,1.75,0]}><coneGeometry args={[.9,1.5,3]}/><meshStandardMaterial color="#fff1d9" side={THREE.DoubleSide}/></mesh></>}
  {specialty==='letters'&&<><Block pos={[0,.82,0]} color="#9cb6b2" size={[1.6,1.25,.86]}/><Block pos={[0,1.5,0]} color={accent} size={[2,.3,1.23]}/><Block pos={[0,.9,.47]} size={[.7,.12,.1]} color="#f8eacb"/><Rune position={[0,1.98,0]} text="✉"/></>}
  {specialty==='market'&&<><Block pos={[0,.65,0]} color="#a17f6e" size={[1.9,.3,1]}/><Post pos={[-.75,1.2,0]} height={2.1} color="#8d7a5d"/><Post pos={[.75,1.2,0]} height={2.1} color="#8d7a5d"/><Cone pos={[0,2.3,0]} color={accent} r={1.3} h={.9}/>{[-.4,0,.4].map((x,i)=><Orb key={i} pos={[x,.94,.35]} color={i===1?'#e9d180':'#de938e'} size={[.21,.2,.2]}/>)}</>}
  {specialty==='clocks'&&<><Post pos={[0,1.2,0]} height={2.4} color="#9a8f7b"/><mesh position={[0,2.2,.11]}><cylinderGeometry args={[.73,.73,.23,24]}/><meshStandardMaterial color={accent}/></mesh><Rune text="⌚" position={[0,2.18,.28]}/></>}
  {specialty==='lanterns'&&<>{[-.7,0,.7].map((x,i)=><group position={[x,0,0]} key={i}><Post pos={[0,.85,0]} height={1.6} color="#a18e7a"/><Orb pos={[0,1.62,0]} size={[.28,.35,.28]} color={i===1?'#ffda89':accent}/><Cone pos={[0,2.0,0]} r={.37} h={.25} color="#c47f68"/></group>)}</>}
  {specialty==='stars'&&<><Post pos={[0,.8,0]} color="#9aa1a4" height={1.2}/><Orb pos={[0,1.5,0]} size={[.9,.65,.88]} color="#bdc7cf"/><mesh position={[0,1.9,.6]} rotation={[-.6,0,0]}><cylinderGeometry args={[.3,.48,1.4,8]}/><meshStandardMaterial color="#758ca0"/></mesh><Rune text="✦" position={[.95,2.7,-.1]}/></>}
  {specialty==='hearts'&&<><Post pos={[0,.7,0]} color="#a18e7a" height={1.3}/><Orb pos={[0,1.64,0]} size={[.79,.65,.75]} color={accent}/><Orb pos={[-.52,1.45,.18]} size={[.42,.47,.44]} color="#f7d9d3"/><Orb pos={[.5,1.42,-.18]} size={[.42,.49,.43]} color="#f2b5b4"/></>}
  {night&&<pointLight position={[0,2,1]} color={accent} intensity={2} distance={7}/>}
 </group>;
}
const DECOR_POSITIONS:[number,number][]=[[-3.65,.55],[-2.4,-2.8],[2.8,2.35],[3.55,-.25]];
function ChapterDecor({specialty,accent}:{specialty:ChapterTheme['specialty'];accent:string}){
 return <group>{DECOR_POSITIONS.map(([x,z],i)=><group key={i} position={[x,0,z]} rotation={[0,i*1.23,0]}>
   {specialty==='hearts'&&<>
     <Orb pos={[0,.25,0]} color="#e3d4b4" size={[.4,.24,.35]}/>
     <Orb pos={[0,.58,0]} color={accent} size={[.32,.37,.3]}/>
     <Orb pos={[.22,.73,.1]} color="#ffdfd8" size={[.18,.21,.16]}/>
   </>}
   {specialty==='books'&&<>{[0,1,2].map(n=><Block key={n} pos={[0,.18+n*.13,0]} color={['#c6a9a4','#c3c5ae','#9caebf'][n]} size={[.75-n*.1,.14,.5]}/>)}</>}
   {specialty==='rocks'&&<><mesh position={[0,.28,0]} castShadow><dodecahedronGeometry args={[.45,0]}/><meshStandardMaterial color={i%2?'#d6b79b':'#aa9889'} flatShading/></mesh><Orb pos={[.24,.12,.22]} color="#8aa784" size={[.18,.11,.2]}/></>}
   {specialty==='ponds'&&<><Orb pos={[0,.07,0]} color="#83cad1" size={[.58,.07,.38]}/>{[-.24,.2].map((r,n)=><Post key={n} pos={[r,.3,.13]} color="#80a382" height={.56}/>)}</>}
   {specialty==='sails'&&<><Block pos={[0,.32,0]} color="#bc967a" size={[.59,.56,.58]}/><Post pos={[0,.82,0]} color="#a48d79" height={.68}/><Cone pos={[.2,1.08,0]} color="#f0dabb" r={.36} h={.59}/></>}
   {specialty==='cinema'&&<><Block pos={[0,.53,0]} color="#555e78" size={[.75,.88,.28]}/><Block pos={[0,.65,.17]} color="#f0e6cc" size={[.58,.41,.07]}/>{[-.22,.22].map(r=><Orb key={r} pos={[r,1.05,0]} size={[.12,.12,.09]} color={accent}/>)}</>}
   {specialty==='letters'&&<><Post pos={[0,.45,0]} color="#9c8c7b" height={.8}/><Block pos={[0,.96,0]} color="#b6b8c1" size={[.68,.5,.45]}/><Block pos={[0,1.02,.26]} color="#f9eacf" size={[.42,.09,.08]}/></>}
   {specialty==='market'&&<><Block pos={[0,.23,0]} color="#c69b72" size={[.76,.43,.65]}/>{[-.2,0,.2].map((r,n)=><Orb key={n} pos={[r,.49,.04]} color={n===1?'#eaca86':'#dd9183'} size={[.18,.16,.19]}/>)}</>}
   {specialty==='clocks'&&<><Post pos={[0,.51,0]} color="#998a73" height={.93}/><Orb pos={[0,1.01,0]} color="#f1e6c9" size={[.36,.36,.15]}/><Post pos={[.11,1.03,.17]} color="#856d65" height={.33}/></>}
   {specialty==='lanterns'&&<><Post pos={[0,.75,0]} color="#948475" height={1.22}/><Orb pos={[0,1.42,0]} color={accent} size={[.3,.39,.31]}/><Orb pos={[0,1.42,0]} color="#f9ebae" size={[.15,.25,.16]}/></>}
   {specialty==='stars'&&<><Post pos={[0,.72,0]} color="#b0a6a1" height={1.22}/><mesh position={[0,1.44,0]}><icosahedronGeometry args={[.37,0]}/><meshStandardMaterial color="#f1d7a0" emissive="#ad905e" emissiveIntensity={.24}/></mesh></>}
 </group>)}</group>;
}
const FURNITURE_SITES:Record<BuildingId,[number,number]>={
 'flower-bed':[-.5,2.5],'story-bench':[2.35,2.45],
 'picnic-table':[-1.6,-2.75],'lantern-arch':[-2.45,2.5]
};
function VillageFurniture({placed,accent}:{placed:string[];accent:string}){
 return <group>{(Object.keys(FURNITURE_SITES) as BuildingId[]).filter(id=>placed.includes(id)).map(id=>{
   const [x,z]=FURNITURE_SITES[id];
   return <group key={id} position={[x,0,z]}>
     {id==='flower-bed'&&<>
       <Block pos={[0,.13,0]} size={[1.02,.24,.78]} color="#b08b72"/>
       <Block pos={[0,.27,0]} size={[.88,.12,.65]} color="#6c9471"/>
       {[-.3,0,.3].map((px,i)=><group position={[px,0,-.12+i*.11]} key={i}>
         <Post pos={[0,.54,0]} height={.5} color="#669b75"/>
         <Orb pos={[0,.84,0]} size={[.2,.16,.2]} color={i===1?'#fff3ca':accent}/>
       </group>)}
     </>}
     {id==='story-bench'&&<>
       <Block pos={[0,.47,0]} size={[1.3,.2,.5]} color="#b88b6d"/>
       <Block pos={[0,.92,-.21]} size={[1.3,.78,.16]} color="#c69b7b"/>
       {[-.46,.46].map(px=><Post key={px} pos={[px,.26,0]} height={.4} color="#8b755e"/>)}
       <Block pos={[.19,.64,.02]} size={[.37,.12,.29]} color="#f5e9d0"/>
     </>}
     {id==='picnic-table'&&<>
       <Block pos={[0,.66,0]} size={[1.3,.2,.93]} color="#d6b18a"/>
       {[-.43,.43].map(px=><Post key={px} pos={[px,.35,0]} height={.6} color="#b39473"/>)}
       <Block pos={[0,.75,0]} size={[.78,.03,.5]} color="#f8eccc"/>
       {[-.18,.18].map((px,i)=><Orb key={i} pos={[px,.83,.06]} color={i===0?'#e4a88f':'#eac77e'} size={[.16,.1,.15]}/>)}
     </>}
     {id==='lantern-arch'&&<>
       {[-.55,.55].map(px=><group key={px}>
         <Post pos={[px,.83,0]} height={1.5} color="#a48c70"/>
         <Orb pos={[px,1.48,.12]} size={[.22,.29,.22]} color={accent}/>
         <Orb pos={[px,1.48,.15]} size={[.1,.16,.13]} color="#ffedba"/>
       </group>)}
       <Block pos={[0,1.62,0]} size={[1.36,.21,.3]} color="#c5a27d"/>
       <Orb pos={[0,1.87,0]} size={[.25,.25,.15]} color="#f4dfb2"/>
     </>}
   </group>;
 })}</group>;
}
function AnswerPillar({index,position,active,color,mode,onApproach}:{index:number;position:[number,number];active:boolean;color:string;mode:GameMode;onApproach:(index:number)=>void}){
 const glint=useRef<Group>(null);
 useFrame(({clock})=>{if(glint.current){glint.current.position.y=1.19+.09*Math.sin(clock.getElapsedTime()*2.1+index*2);glint.current.rotation.y=.15*Math.sin(clock.getElapsedTime()*.8)}});
 return <group position={[position[0],0,position[1]]} onClick={(e:ThreeEvent<MouseEvent>)=>{e.stopPropagation();onApproach(index)}}>
   <mesh position={[0,.1,0]} castShadow receiveShadow><cylinderGeometry args={[.66,.77,.21,12]}/><meshStandardMaterial color="#f6e3c1" roughness={.95}/></mesh>
   <mesh position={[0,.18,0]}><cylinderGeometry args={[.51,.6,.06,12]}/><meshStandardMaterial color={color}/></mesh>
   {mode==='word'&&<>
     <Post pos={[0,.71,0]} color="#659b79" height={1.05}/>
     <Orb pos={[-.25,.61,.06]} color="#8dbb81" size={[.34,.11,.19]}/>
     <Orb pos={[.25,.72,-.06]} color="#86aa80" size={[.34,.11,.2]}/>
     <group ref={glint} position={[0,1.19,0]}>
       {Array.from({length:7},(_,i)=>{
         const angle=i*Math.PI*2/7;
         return <Orb key={i} pos={[Math.sin(angle)*.32,Math.cos(angle)*.31,0]} color={color} size={[.21,.26,.17]}/>;
       })}
       <Orb pos={[0,0,.12]} color="#ffe2a5" size={[.28,.31,.17]}/>
       <group position={[0,0,.31]}><Rune text={String.fromCharCode(65+index)} color="#fff4d9" scale={.75}/></group>
     </group>
   </>}
   {mode==='story'&&<>
     <Post pos={[0,.68,0]} color="#aa9277" height={.8}/>
     <Block pos={[0,.98,0]} color="#866b63" size={[1.01,.21,.63]}/>
     <Block pos={[-.23,1.13,.05]} color="#fff0d8" size={[.44,.1,.6]} rot={-.12}/>
     <Block pos={[.23,1.13,.05]} color="#fff0d8" size={[.44,.1,.6]} rot={.12}/>
     <group ref={glint} position={[0,1.24,0]}><Orb pos={[0,0,0]} color={color} size={[.3,.37,.26]}/><group position={[0,0,.28]}><Rune text={String.fromCharCode(65+index)} color="#fff4d9" scale={.8}/></group></group>
     <Orb pos={[.51,1.08,.02]} color="#debd85" size={[.075,.28,.06]}/>
   </>}
   {mode==='debate'&&<>
     <Post pos={[-.4,.82,-.1]} color="#a48771" height={1.45}/>
     <Post pos={[.4,.82,-.1]} color="#a48771" height={1.45}/>
     <Block pos={[0,1.63,-.1]} color={color} size={[1.14,.23,.31]}/>
     <mesh position={[0,1.3,-.1]} castShadow><coneGeometry args={[.56,.73,3]}/><meshStandardMaterial color={color} roughness={.9} side={THREE.DoubleSide}/></mesh>
     <group ref={glint} position={[0,1.2,0]}><Orb pos={[0,0,0]} color={color} size={[.29,.32,.23]}/><group position={[0,0,.25]}><Rune text={String.fromCharCode(65+index)} color="#fff4d9" scale={.78}/></group></group>
   </>}
   {active&&<mesh position={[0,.06,0]} rotation={[-Math.PI/2,0,0]}><torusGeometry args={[.95,.06,7,24]}/><meshBasicMaterial color="#fff1b4"/></mesh>}
 </group>;
}
function Avatar({avatar,heading,anim,level}:{avatar:THREE.Vector3;heading:React.RefObject<number>;anim:React.RefObject<{t:number;moving:boolean}>;level:number}){
 const character=useRef<Group>(null);
 useFrame(()=>{
  if(!character.current)return;
  character.current.position.copy(avatar);
  character.current.rotation.y=heading.current;
 });
 return <group ref={character}>
  <Wildlife kind="fox" pos={[0,0,0]} color="#d98c68" anim={anim}/>
  <Orb pos={[0,1.37,-.03]} color={level>=15?'#d5b6ea':level>=5?'#e6b275':'#4f998c'} size={[.35,.13,.26]}/>
  <Orb pos={[0,1.44,-.09]} color="#e9c590" size={[.15,.07,.12]}/>
  <Orb pos={[0,.6,-.33]} color="#809d87" size={[.23,.25,.11]}/>
 </group>;
}
function Scene({week,mode,round,active,reduced,power,foundSeeds,avatarLevel,placedDecorations,requestedDestination,inputs,onEnter,onCollect,onSeed,onNearby,onPosition}:WorldProps){
 const theme=chapterTheme(week);const avatar=useRef(new THREE.Vector3(0,0,2.4));const heading=useRef(0);
 const group=useRef<Group>(null);const {camera,size}=useThree();
 const pressed=useRef(new Set<string>());const lastPosition=useRef(0);const lastPick=useRef(0);const nearRef=useRef<Encounter|null>(null);
 const armedSeeds=useRef([true,true,true,true,true]);
 const anim=useRef({t:0,moving:false});
 const walkTarget=useRef<WalkTarget|null>(null);
 const destinationMarker=useRef<Group>(null);
 useEffect(()=>{
   avatar.current.set(0,0,mode==='explore'?0:2.55);heading.current=0;lastPick.current=0;nearRef.current=null;onNearby(null);armedSeeds.current=[true,true,true,true,true];walkTarget.current=null;
 },[week,mode,round,onNearby]);
 useEffect(()=>{
   if(mode!=='explore'||!requestedDestination)return;
   const place=PORTALS[requestedDestination.kind as Challenge]||NEIGHBORS[requestedDestination.kind as 'neighbor1'|'neighbor2'];
   if(!place)return;
   walkTarget.current={x:place.x,z:place.z,radius:requestedDestination.kind.startsWith('neighbor')?1.05:1.35,kind:'encounter',value:requestedDestination.kind};
 },[requestedDestination,mode]);
 useEffect(()=>{
   const isEditable=(target:EventTarget|null)=>target instanceof HTMLElement&&(target.closest('input,textarea,select,[contenteditable="true"]')!==null);
   const down=(event:KeyboardEvent)=>{
     if(isEditable(event.target))return;
     const key=event.key.toLowerCase();
     if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(key))event.preventDefault();
     pressed.current.add(key);
     if(key==='e'&&mode==='explore'&&nearRef.current&&active)onEnter(nearRef.current);
   };
   const up=(event:KeyboardEvent)=>pressed.current.delete(event.key.toLowerCase());
   const blur=()=>pressed.current.clear();
   addEventListener('keydown',down);addEventListener('keyup',up);addEventListener('blur',blur);
   return()=>{removeEventListener('keydown',down);removeEventListener('keyup',up);removeEventListener('blur',blur)};
 },[mode,active,onEnter]);
 const trees=useMemo(()=>Array.from({length:18},(_,i)=>{
   const theta=(i+.35)*Math.PI*2/18;
   const outer=i%3===0?5.3:4.9;return {x:Math.cos(theta)*outer,z:Math.sin(theta)*outer*.79,index:i};
 }),[]);
 useFrame((state,dt)=>{
   const t=state.clock.getElapsedTime();
   anim.current.t=t;
   const p=pressed.current;
   const touching=inputs.current;
   let dx=Number(p.has('d')||p.has('arrowright'))-Number(p.has('a')||p.has('arrowleft'))+touching.x;
   let dz=Number(p.has('s')||p.has('arrowdown'))-Number(p.has('w')||p.has('arrowup'))+touching.z;
   const manual=Math.hypot(dx,dz);
   if(manual>.05)walkTarget.current=null;
   const destination=walkTarget.current;
   if(active&&manual<=.05&&destination){
     const distance=Math.hypot(destination.x-avatar.current.x,destination.z-avatar.current.z);
     if(distance<=destination.radius){
       walkTarget.current=null;lastPick.current=t;
       if(destination.kind==='encounter')onEnter(destination.value as Encounter);
       else if(destination.kind==='seed'){armedSeeds.current[destination.value as number]=false;onSeed(destination.value as number)}
       else if(destination.kind==='answer')onCollect(destination.value as number);
     }else{
       dx=(destination.x-avatar.current.x)/distance;dz=(destination.z-avatar.current.z)/distance;
     }
   }
   const mag=Math.hypot(dx,dz);
   anim.current.moving=active&&mag>.05;
   if(active&&mag>.05){
     dx/=Math.max(1,mag);dz/=Math.max(1,mag);
     const speed=destination&&manual<=.05?4.15:(p.has('shift')||touching.dash)?5.1:3;
     // Motion uses elapsed time rather than a 45ms per-frame cap, so reduced
     // frame rates do not turn a walk into slow motion. Clamp tab-resume spikes.
     const step=Math.min(dt,.12)*speed;
     let x=THREE.MathUtils.clamp(avatar.current.x+dx*step,-4.5,4.5);
     let z=THREE.MathUtils.clamp(avatar.current.z+dz*step,-3.15,3.15);
     // Landmark and portal geometry form physical obstacles in exploration.
     const blocked=mode==='explore'&&(
       Math.hypot(x,z+4.8)<1.1||
       trees.some(tree=>Math.hypot(x-tree.x,z-tree.z)<.34)||
       (Object.keys(FURNITURE_SITES) as BuildingId[]).some(id=>{
         if(!placedDecorations.includes(id))return false;
         const [px,pz]=FURNITURE_SITES[id];
         return Math.hypot(x-px,z-pz)<.32;
       })||
       (Math.hypot(x-NEIGHBORS.neighbor1.x,z-NEIGHBORS.neighbor1.z)<.35)||
       (Math.hypot(x-NEIGHBORS.neighbor2.x,z-NEIGHBORS.neighbor2.z)<.35)
     );
     if(blocked){x=avatar.current.x;z=avatar.current.z;}
     avatar.current.set(x,0,z);
     const targetHeading=Math.atan2(dx,dz);
     heading.current+=Math.atan2(Math.sin(targetHeading-heading.current),Math.cos(targetHeading-heading.current))*(1-Math.exp(-dt*11));
   }
   const lerp=active&&!reduced?1-Math.exp(-Math.min(dt,.045)*5):1;
   const off=size.width<580?[5.4,7.1,9.1]:[6.9,7.8,9.7];
   const desired=new THREE.Vector3(avatar.current.x*.36+off[0],off[1],avatar.current.z*.38+off[2]);
   const look=new THREE.Vector3(avatar.current.x*.38,.32,avatar.current.z*.37-.75);
   camera.position.lerp(desired,lerp);camera.lookAt(look);
   if(group.current)group.current.scale.setScalar(1);
   if(destinationMarker.current){
     destinationMarker.current.visible=Boolean(walkTarget.current);
     if(walkTarget.current)destinationMarker.current.position.set(walkTarget.current.x,.1,walkTarget.current.z);
   }
   if(t-lastPosition.current>.16){
     onPosition(avatar.current.x,avatar.current.z);
     lastPosition.current=t;
     if(mode==='explore'){
       let candidate:Encounter|null=null;let distance=1.95;
       (Object.keys(PORTALS) as Challenge[]).forEach(kind=>{
         const point=PORTALS[kind];const dist=Math.hypot(avatar.current.x-point.x,avatar.current.z-point.z);
         if(dist<distance){candidate=kind;distance=dist}
       });
       (Object.keys(NEIGHBORS) as ('neighbor1'|'neighbor2')[]).forEach(kind=>{
         const point=NEIGHBORS[kind];const dist=Math.hypot(avatar.current.x-point.x,avatar.current.z-point.z);
         if(dist<Math.min(distance,1.35)){candidate=kind;distance=dist}
       });
       if(candidate!==nearRef.current){nearRef.current=candidate;onNearby(candidate)}
     }
   }
   // Walking to a chosen quest should not be hijacked by a collectible whose
   // proximity trigger happens to overlap the route. Manual foraging and a
   // deliberately clicked seed still collect normally.
   if(active&&mode==='explore'&&(!walkTarget.current||walkTarget.current.kind==='seed')&&t-lastPick.current>.85){
     const seed=SEED_POSITIONS.findIndex(([x,z],i)=>{
       const distance=Math.hypot(avatar.current.x-x,avatar.current.z-z);
       if(distance>1.25)armedSeeds.current[i]=true;
       return !foundSeeds[i]&&armedSeeds.current[i]&&distance<.63;
     });
     if(seed>=0){lastPick.current=t;armedSeeds.current[seed]=false;walkTarget.current=null;onSeed(seed);}
   }
   if(active&&mode!=='explore'&&mode!=='voice'&&t-lastPick.current>.85){
     const near=ANSWERS.findIndex(([x,z])=>Math.hypot(avatar.current.x-x,avatar.current.z-z)<.83);
     if(near>=0){lastPick.current=t;walkTarget.current=null;avatar.current.set(0,0,2.55);onCollect(near);}
   }
 });
 const approachPortal=(kind:Challenge)=>{
   if(!active||mode!=='explore')return;
   const point=PORTALS[kind];
   walkTarget.current={x:point.x,z:point.z,radius:1.35,kind:'encounter',value:kind};
 };
 const approachSeed=(index:number)=>{
   if(!active||mode!=='explore'||foundSeeds[index])return;
   const [x,z]=SEED_POSITIONS[index];
   walkTarget.current={x,z,radius:.57,kind:'seed',value:index};
 };
 const approachAnswer=(index:number)=>{
   if(!active||mode==='explore'||mode==='voice')return;
   const [x,z]=ANSWERS[index];
   walkTarget.current={x,z,radius:.75,kind:'answer',value:index};
 };
 const walkToGround=(event:ThreeEvent<MouseEvent>)=>{
   if(!active||mode!=='explore')return;
   walkTarget.current={x:THREE.MathUtils.clamp(event.point.x,-4.5,4.5),z:THREE.MathUtils.clamp(event.point.z,-3.15,3.15),radius:.18,kind:'walk',value:null};
 };
 const colors=['#ebada5','#f1c88f','#a6a9db'];
 return <>
  <color attach="background" args={[theme.sky]}/>
  <fog attach="fog" args={[theme.sky,15,34]}/>
  <hemisphereLight args={['#fff4de','#708f86',theme.night?1.4:2.1]}/>
  <ambientLight intensity={theme.night?.5:.35}/>
  <directionalLight castShadow position={[5,9,6]} intensity={theme.night?1.3:2.1} color={theme.night?'#c3c9ed':'#ffe9b8'}
   shadow-mapSize-width={1024} shadow-mapSize-height={1024} shadow-camera-left={-9} shadow-camera-right={9} shadow-camera-top={9} shadow-camera-bottom={-9}/>
  <group ref={group}>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.18,0]} receiveShadow><planeGeometry args={[200,200]}/><meshStandardMaterial color={theme.sky} roughness={1}/></mesh>
    <mesh position={[0,-.25,0]} receiveShadow><cylinderGeometry args={[6.55,7.15,.5,28]}/><meshStandardMaterial color="#acb29a" flatShading/></mesh>
    <mesh position={[0,-.08,0]} receiveShadow onClick={walkToGround}><cylinderGeometry args={[6.35,6.53,.22,28]}/><meshStandardMaterial color={theme.ground} roughness={1}/></mesh>
    <group ref={destinationMarker} visible={false}>
      <mesh rotation={[-Math.PI/2,0,0]}><torusGeometry args={[.37,.065,8,24]}/><meshBasicMaterial color="#fff0b2" transparent opacity={.85}/></mesh>
      <Orb pos={[0,.16,0]} color="#f5dc93" size={[.11,.11,.11]}/>
    </group>
    {mode==='explore'?<>
      <mesh rotation={[-Math.PI/2,0,0]} position={[0,.038,0]}><planeGeometry args={[1.2,7.4]}/><meshStandardMaterial color={theme.path} roughness={1}/></mesh>
      <mesh rotation={[-Math.PI/2,0,0]} position={[0,.039,0]}><planeGeometry args={[8.8,1.15]}/><meshStandardMaterial color={theme.path} roughness={1}/></mesh>
      <Landmark specialty={theme.specialty} accent={theme.accent} night={theme.night}/>
      <ChapterDecor specialty={theme.specialty} accent={theme.accent}/>
      <VillageFurniture placed={placedDecorations} accent={theme.accent}/>
      {(Object.keys(PORTALS) as Challenge[]).map(kind=><Portal kind={kind} near={false} onApproach={approachPortal} key={kind}/>)}
      <group position={[-1.45,0,1.4]} onClick={e=>{e.stopPropagation();if(active)walkTarget.current={x:-1.45,z:1.4,radius:1,kind:'encounter',value:'neighbor1'}}}><Wildlife pos={[0,0,0]} kind={chapterCreature[week-1]} color={chapterCreatureColor[week-1]}/></group>
      <group position={[1.5,0,-2.8]} onClick={e=>{e.stopPropagation();if(active)walkTarget.current={x:1.5,z:-2.8,radius:1,kind:'encounter',value:'neighbor2'}}}><Wildlife pos={[0,0,0]} kind="owl" color="#b79a91"/></group>
      {SEED_POSITIONS.map((pos,i)=>!foundSeeds[i]&&<WordSeed key={i} index={i} pos={pos} onApproach={approachSeed} color={theme.accent}/>)}
      {Array.from({length:12},(_,i)=>{const a=i*2.399;const r=2+(i%3)*.92;return <group key={i} position={[Math.cos(a)*r,.06,Math.sin(a)*r*.7]}><Orb pos={[0,.07,0]} size={[.12,.08,.12]} color={i%2===0?theme.accent:'#fff0ad'}/><Post pos={[0,.07,0]} height={.2} color="#5c946b"/></group>})}
    </>:<>
      <mesh rotation={[-Math.PI/2,0,0]} position={[0,.038,-.3]}><planeGeometry args={[6.9,5.8]}/><meshStandardMaterial color={mode==='word'?'#e7efd9':mode==='story'?'#e9dbc5':mode==='debate'?'#dadfea':theme.path} roughness={1}/></mesh>
      {mode==='story'&&<group position={[0,.05,0]}>
       {Array.from({length:4},(_,i)=><group key={i} position={[-2.3+i*1.54,0,.73]}>
         <Block pos={[0,.05,0]} color={i<=round?'#e7b87f':'#b4bbb5'} size={[.92,.11,.68]}/>
         <Orb pos={[0,.13,0]} color={i<=round?'#ffe4a0':'#d2dacd'} size={[.16,.12,.16]}/>
       </group>)}
       <Block pos={[0,.18,-3.75]} color="#b99271" size={[2.85,.35,.86]}/>
       <Block pos={[0,1.18,-3.9]} color="#c9a982" size={[2.2,1.9,.25]}/>
       <Rune text="✦" position={[0,1.2,-3.71]} scale={1.2}/>
      </group>}
      {mode==='debate'&&<group>
        <mesh rotation={[-Math.PI/2,0,0]} position={[0,.085,-.55]}>
          <torusGeometry args={[2.8,.1,8,32]}/><meshStandardMaterial color="#c8a4c9" roughness={.9}/>
        </mesh>
        {[-1.4,0,1.4].map((x,i)=><group key={i} position={[x,0,-3.1]}>
          <Post pos={[0,.65,0]} color="#a0877b" height={1.15}/>
          <Orb pos={[0,1.22,0]} color={i===0?'#e8af9a':i===1?'#d9c5a4':'#b0bbda'} size={[.32,.39,.34]}/>
          <Orb pos={[0,1.32,.3]} color="#f7edd9" size={[.21,.16,.1]}/>
        </group>)}
      </group>}
      {mode==='voice'?Array.from({length:4},(_,i)=>{
        const x=(i-1.5)*1.55;const lit=(i+1)*.25<=power+.001;
        return <group key={i} position={[x,0,-1.9]}>
          <Post pos={[0,.54,0]} color="#927f74" height={1}/>
          <Orb pos={[0,1.18,0]} color={lit?'#f9dc85':'#839997'} size={[.4,.52,.39]}/>
          {lit&&<pointLight position={[0,1.15,0]} color="#ffdda0" intensity={1.8} distance={3}/>}
        </group>;
      }):ANSWERS.map((pos,i)=><AnswerPillar key={i} index={i} position={pos} color={colors[i]} active={false} mode={mode} onApproach={approachAnswer}/>)}
      <group position={[0,0,-4.75]}><Wildlife pos={[0,0,0]} kind={week%3===0?'bear':'owl'} color="#b49c90"/></group>
    </>}
    {trees.map(({x,z,index})=><Tree key={index} x={x} z={z} foliage={theme.foliage} index={index}/>)}
    <Avatar avatar={avatar.current} heading={heading} anim={anim} level={avatarLevel}/>
  </group>
 </>;
}
function Fallback({mode,onEnter,onCollect,onSeed,foundSeeds,week}:{mode:GameMode;onEnter:(x:Encounter)=>void;onCollect:(index:number)=>void;onSeed:(index:number)=>void;foundSeeds:boolean[];week:number}){
 const labels:Challenge[]=['word','story','debate','voice'];
 return <div className="adventure-fallback"><div className="adventure-fallback-art"><span>✳</span><h3>Wildwood is ready to explore</h3><p>Your learning quests still work without 3D graphics.</p></div>
 {mode==='explore'?<div className="adventure-fallback-actions">
   {labels.map(k=><button key={k} onClick={()=>onEnter(k)}>Enter {k} challenge</button>)}
   {foundSeeds.map((found,i)=>!found&&<button key={'seed'+i} onClick={()=>onSeed(i)}>Discover word seed {i+1}</button>)}
   <button onClick={()=>onEnter('neighbor1')}>Speak to {chapterTheme(week).companion}</button>
   <button onClick={()=>onEnter('neighbor2')}>Speak to Ollie the owl</button>
  </div>:mode==='voice'?<p>Speak to bring the lanterns to life.</p>:<div className="adventure-fallback-actions">{[0,1,2].map(i=><button key={i} onClick={()=>onCollect(i)}>Choose {String.fromCharCode(65+i)}</button>)}</div>}
 </div>;
}
export default memo(function AdventureWorld(props:WorldProps){
 const [supported,setSupported]=useState<boolean|null>(null);
 const [visible,setVisible]=useState(true);
 const [pageVisible,setPageVisible]=useState(!document.hidden);
 const container=useRef<HTMLDivElement>(null);
 useEffect(()=>{try{const c=document.createElement('canvas');setSupported(!!(c.getContext('webgl2')||c.getContext('webgl')))}catch{setSupported(false)}},[]);
 useEffect(()=>{
  const changed=()=>setPageVisible(!document.hidden);
  document.addEventListener('visibilitychange',changed);
  return()=>document.removeEventListener('visibilitychange',changed);
 },[]);
 useEffect(()=>{
  const e=container.current;if(!e||!('IntersectionObserver' in window))return;
  const observer=new IntersectionObserver(entries=>setVisible(Boolean(entries[0]?.isIntersecting)),{threshold:.01});
  observer.observe(e);return()=>observer.disconnect();
 },[]);
 useEffect(()=>{
  if(supported===false&&props.mode==='explore'&&props.requestedDestination&&props.active){
    props.onEnter(props.requestedDestination.kind);
  }
 },[supported,props.mode,props.requestedDestination,props.active,props.onEnter]);
 return <div className="adventure-world" ref={container}>
  {supported?<Canvas dpr={[1,Math.min(devicePixelRatio,1.45)]} shadows gl={{antialias:true,alpha:false,powerPreference:'high-performance'}}
   camera={{position:[6.9,7.8,9.7],fov:46,near:.1,far:70}}
   frameloop={visible&&pageVisible?'always':'demand'}
   onCreated={({gl})=>{gl.domElement.addEventListener('webglcontextlost',()=>setSupported(false),{once:true})}}>
    <Scene {...props}/>
   </Canvas>:<Fallback mode={props.mode} onEnter={props.onEnter} onCollect={props.onCollect} onSeed={props.onSeed} foundSeeds={props.foundSeeds} week={props.week}/>}
  <div className="adventure-world-label">{supported===false?'Storybook mode':'LIVE WORLD · INTERACTIVE'}</div>
 </div>;
});
