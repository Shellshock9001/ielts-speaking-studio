import {Canvas,useFrame,useThree,type ThreeEvent} from '@react-three/fiber';
import {memo,useCallback,useEffect,useMemo,useRef,useState} from 'react';
import type {RefObject} from 'react';
import * as THREE from 'three';
import type {Group} from 'three';
import {
 REGIONS,REGION_BY_WEEK,ALL_ACTORS,ACTOR_BY_ID,
 WORLD_BOUNDS,closestRegion,zonesNear,seedPoint,SEED_OFFSETS,type Actor,type Region,type Species
} from './worldData';
import type {BuildingId} from '../game/buildings';
import {available,resourceNodes,TOOL_IDS,TOOL_META,type FieldNode,type FieldState,type ToolId,type FishRound} from './play';
import {levelForXp} from './play';
import type {Vitals,PlayerMode} from './GameUI';
import {academySound} from './sound';

export type WalkInput={x:number;z:number;run:boolean;sneak:boolean;jumpSerial:number;dodgeSerial:number;actionSerial:number;
 cameraX:number;cameraY:number;zoom:number};
export type TravelCommand={serial:number;x:number;z:number;actorId?:string;seed?:{week:number;index:number};resourceId?:string};
export type WorldChallenge={id:string;round:number;style:'word'|'story'|'debate';options:string[];anchor:[number,number]};
export type WorldSceneProps={
 worldPos:[number,number];regionWeek:number;input:RefObject<WalkInput>;active:boolean;reduced:boolean;
 travel:TravelCommand|null;challenge:WorldChallenge|null;lanterns:number;availableActors:Actor[];
 foundSeeds:Record<string,boolean>;decorations:Record<string,string[]>;
 field:FieldState;tool:ToolId;fish:FishRound|null;actionPulse:{serial:number;kind:string;pos:[number,number]}|null;
 onActor:(id:string)=>void;onNearby:(id:string|null)=>void;onMove:(x:number,z:number)=>void;
 onCheckpoint:(x:number,z:number)=>void;onRegion:(week:number)=>void;onChallengeChoice:(index:number)=>void;onSeed:(week:number,index:number)=>void;
 onFieldUse:(nodeId:string)=>void;onGiveActor:(id:string)=>void;onEquip:(id:ToolId)=>void;
 onVitals:(vitals:Vitals)=>void;onGamepadAction:(action:'talk'|'use'|'bag'|'missions'|'cycle-forward'|'cycle-back')=>void;
};
type Trip={x:number;z:number;actorId?:string;seed?:{week:number;index:number};resourceId?:string};
function Ball({p,c,s=[1,1,1],emissive}:{p:[number,number,number];c:string;s?:[number,number,number];emissive?:boolean}){
 return <mesh position={p} scale={s} castShadow><sphereGeometry args={[1,12,9]}/><meshStandardMaterial color={c} roughness={.87} metalness={0} emissive={emissive?c:undefined} emissiveIntensity={emissive?.24:0}/></mesh>;
}
function Box({p,c,s,rot=0}:{p:[number,number,number];c:string;s:[number,number,number];rot?:number}){
 return <mesh position={p} rotation={[0,rot,0]} castShadow receiveShadow><boxGeometry args={s}/><meshStandardMaterial color={c} roughness={.83}/></mesh>;
}
function Stem({p,c,h=.7,r=.1}:{p:[number,number,number];c:string;h?:number;r?:number}){
 return <mesh position={p} castShadow><cylinderGeometry args={[r*.82,r,h,8]}/><meshStandardMaterial color={c} roughness={.95}/></mesh>;
}
function Conic({p,c,h,r=.28}:{p:[number,number,number];c:string;h:number;r?:number}){
 return <mesh position={p} castShadow><coneGeometry args={[r,h,8]}/><meshStandardMaterial color={c} roughness={.9}/></mesh>;
}
function WrittenPlaque({title,color='#fff2ce',background='#315c52',size=1}:{title:string;color?:string;background?:string;size?:number}){
 const billboard=useRef<Group>(null);
 useFrame(({camera})=>{if(billboard.current)billboard.current.quaternion.copy(camera.quaternion)});
 const texture=useMemo(()=>{
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=160;
  const ctx=canvas.getContext('2d')!;
  ctx.fillStyle=background;ctx.beginPath();ctx.roundRect(9,9,494,142,44);ctx.fill();
  ctx.strokeStyle='#ebd6b2';ctx.lineWidth=8;ctx.beginPath();ctx.roundRect(15,15,482,130,38);ctx.stroke();
  ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';
  const maxLength=title.length;ctx.font='800 '+(maxLength>20?27:maxLength>13?36:48)+'px ui-rounded, system-ui, sans-serif';
  ctx.fillText(title,256,82,445);
  const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;return t;
 },[title,color,background]);
 useEffect(()=>()=>texture.dispose(),[texture]);
 return <group ref={billboard}><mesh scale={[2.05*size,.64*size,1]}><planeGeometry args={[1,1]}/><meshBasicMaterial map={texture} transparent side={THREE.DoubleSide} depthWrite={false}/></mesh></group>;
}
const earByKind=(kind:Species):'long'|'point'|'round'=>['rabbit','deer'].includes(kind)?'long':[
 'fox','cat','lynx','squirrel','hedgehog','owl','bird'
].includes(kind)?'point':'round';
function Creature({actor,position,busy=false}:{actor:Actor;position:[number,number];busy?:boolean}){
 const body=useRef<Group>(null),left=useRef<Group>(null),right=useRef<Group>(null),eyes=useRef<Group>(null);
 const ear=earByKind(actor.species),isBird=actor.species==='bird',special=actor.species==='panda';
 const seed=actor.id.split('').reduce((a,c)=>a+c.charCodeAt(0),0);
 useFrame(({clock,camera})=>{
  const t=clock.getElapsedTime();
  if(body.current){
   body.current.position.y=.02+Math.sin(t*1.36+seed*.6)*.046;
   body.current.rotation.y=.14*Math.sin(t*.75+seed);
   if(busy){
     const target=Math.atan2(camera.position.x-position[0],camera.position.z-position[1]);
     body.current.rotation.y+=target*.025;
   }
  }
  if(left.current)left.current.rotation.x=.16*Math.sin(t*1.2+seed);
  if(right.current)right.current.rotation.x=-.16*Math.sin(t*1.4+seed);
  if(eyes.current)eyes.current.scale.y=Math.sin(t*.8+seed)>.987?.1:1;
 });
 return <group position={[position[0],0,position[1]]}>
   <group ref={body}>
     <Ball p={[0,.53,0]} c={actor.color} s={[.35,.48,.29]}/>
     <Ball p={[0,1.04,.05]} c={actor.color} s={[.47,.42,.42]}/>
     <Ball p={[0,.85,.39]} c={special?'#f7e9db':'#fff1e1'} s={[.34,.26,.17]}/>
     {ear==='point'?<><Conic p={[-.3,1.42,0]} c={actor.color} h={.47} r={.21}/><Conic p={[.3,1.42,0]} c={actor.color} h={.47} r={.21}/>
       {actor.species==='hedgehog'&&Array.from({length:5},(_,i)=><Conic key={i} p={[-.4+i*.2,1.33,-.19]} c="#988275" r={.11} h={.45}/>)}</>:
       ear==='long'?<><Ball p={[-.23,1.56,-.03]} c={actor.color} s={[.16,.47,.17]}/><Ball p={[.23,1.56,-.03]} c={actor.color} s={[.16,.47,.17]}/>
       <Ball p={[-.23,1.59,.14]} c="#eeadad" s={[.075,.32,.045]}/><Ball p={[.23,1.59,.14]} c="#eeadad" s={[.075,.32,.045]}/></>:
       <><Ball p={[-.35,1.32,0]} c={actor.color} s={[.22,.23,.21]}/><Ball p={[.35,1.32,0]} c={actor.color} s={[.22,.23,.21]}/></>}
     {special&&<><Ball p={[-.18,1.05,.417]} c="#6e5b62" s={[.115,.13,.03]}/><Ball p={[.18,1.05,.417]} c="#6e5b62" s={[.115,.13,.03]}/></>}
     <group ref={eyes}><Ball p={[-.17,1.06,.441]} c="#293f3d" s={[.074,.094,.04]}/><Ball p={[.17,1.06,.441]} c="#293f3d" s={[.074,.094,.04]}/>
       <Ball p={[-.145,1.105,.475]} c="#fffefd" s={[.021,.027,.015]}/><Ball p={[.195,1.105,.475]} c="#fffefd" s={[.021,.027,.015]}/></group>
     {isBird?<Conic p={[0,.93,.49]} c="#deb97e" h={.22} r={.10}/>:<Ball p={[0,.91,.548]} c="#d38f8e" s={[.058,.047,.036]}/>}
     <group ref={left}><Ball p={[-.36,.62,.09]} c={actor.color} s={[.17,.27,.2]}/></group>
     <group ref={right}><Ball p={[.36,.62,.09]} c={actor.color} s={[.17,.27,.2]}/></group>
     <Ball p={[-.18,.13,.08]} c={actor.color} s={[.18,.19,.2]}/>
     <Ball p={[.18,.13,.08]} c={actor.color} s={[.18,.19,.2]}/>
     <Ball p={[.33,.37,-.31]} c={actor.color} s={[.17,.2,actor.species==='fox'?.43:.25]}/>
     {actor.accessory==='bow'&&<><Ball p={[-.15,1.43,.1]} c={actor.accent} s={[.21,.12,.11]}/><Ball p={[.14,1.43,.1]} c={actor.accent} s={[.21,.12,.11]}/><Ball p={[0,1.44,.17]} c="#f7e9d4" s={[.09,.09,.1]}/></>}
     {actor.accessory==='scarf'&&<><Ball p={[0,.79,.08]} c={actor.accent} s={[.39,.11,.32]}/><Box p={[.3,.58,.24]} c={actor.accent} s={[.16,.44,.13]}/></>}
     {actor.accessory==='satchel'&&<><Box p={[-.38,.48,-.15]} c={actor.accent} s={[.29,.38,.25]}/><Box p={[-.22,.68,-.03]} c="#f9eccd" s={[.09,.6,.08]} rot={-.5}/></>}
     {actor.accessory==='glasses'&&<><mesh position={[-.16,1.06,.476]}><torusGeometry args={[.12,.025,6,12]}/><meshStandardMaterial color="#84736d"/></mesh><mesh position={[.16,1.06,.476]}><torusGeometry args={[.12,.025,6,12]}/><meshStandardMaterial color="#84736d"/></mesh><Box p={[0,1.08,.47]} c="#84736d" s={[.11,.02,.02]}/></>}
     {actor.accessory==='leaf'&&<Ball p={[.35,1.34,.02]} c={actor.accent} s={[.18,.1,.12]}/>}
     {actor.accessory==='vest'&&<Ball p={[0,.55,.24]} c={actor.accent} s={[.28,.32,.11]}/>}
     {actor.accessory==='hat'&&<><Ball p={[0,1.47,-.03]} c={actor.accent} s={[.48,.09,.39]}/><Ball p={[0,1.57,-.09]} c={actor.accent} s={[.34,.2,.3]}/></>}
   </group>
   <group position={[0,1.94,0]}><WrittenPlaque title={actor.name} size={.52} background={actor.role==='student'?'#3e7469':'#6d7766'}/></group>
 </group>;
}
function ActorInstance({actor,onSelect,friendship}:{actor:Actor;onSelect:(id:string)=>void;friendship:number}){
 return <group position={[0,0,0]} onClick={e=>{e.stopPropagation();onSelect(actor.id)}}>
  <Creature actor={actor} position={actor.position} busy={friendship>0}/>
  {friendship>0&&<group position={[actor.position[0],2.4,actor.position[1]]}>
   <WrittenPlaque title={'♡ '+friendship} color="#f7dee8" background="#a87883" size={.36}/>
  </group>}
  <mesh position={[actor.position[0],.9,actor.position[1]]} visible={false}><cylinderGeometry args={[.72,.72,2.3,8]}/><meshBasicMaterial transparent opacity={0}/></mesh>
 </group>;
}
function YourCharacter({pos,heading,walking,level,reduced,tool,jumpY,mode,actionTime}:{
 pos:RefObject<THREE.Vector3>;heading:RefObject<number>;walking:RefObject<boolean>;
 level:number;reduced:boolean;tool:ToolId;jumpY:RefObject<number>;mode:RefObject<PlayerMode>;actionTime:RefObject<number>
}){
 const group=useRef<Group>(null),legs=useRef<Group[]>([]),arm=useRef<Group>(null),body=useRef<Group>(null);
 useFrame(({clock})=>{
  if(!group.current)return;
  const t=clock.getElapsedTime();
  const stance=mode.current==='sneak'?.72:1;
  group.current.position.set(pos.current.x,jumpY.current+(reduced?0:Math.sin(t*11)*(walking.current?.038:.012)),pos.current.z);
  group.current.rotation.y=heading.current;
  if(body.current){
   body.current.scale.y=THREE.MathUtils.lerp(body.current.scale.y,stance,.2);
   body.current.rotation.z=THREE.MathUtils.lerp(body.current.rotation.z,mode.current==='dodge'?Math.sin(t*18)*.38:0,.15);
  }
  if(arm.current)arm.current.rotation.x=THREE.MathUtils.lerp(arm.current.rotation.x,Math.max(0,1-(t-actionTime.current)*4)*(-1.4),.25);
  legs.current.forEach((leg,i)=>{if(leg)leg.rotation.x=walking.current?Math.sin(t*10+i*Math.PI)*.33:0});
 });
 return <group ref={group}>
  <group ref={body}>
  <Ball p={[0,.56,0]} c="#d6a078" s={[.36,.48,.32]}/>
  <Ball p={[0,1.13,.05]} c="#dba77e" s={[.47,.45,.43]}/>
  <Ball p={[0,.92,.36]} c="#fff2db" s={[.3,.28,.17]}/>
  <Conic p={[-.29,1.51,-.06]} c="#cf906e" h={.49} r={.2}/>
  <Conic p={[.29,1.51,-.06]} c="#cf906e" h={.49} r={.2}/>
  <Ball p={[-.18,1.14,.444]} c="#2d4843" s={[.075,.09,.03]}/>
  <Ball p={[.18,1.14,.444]} c="#2d4843" s={[.075,.09,.03]}/>
  <Ball p={[0,.96,.515]} c="#c38177" s={[.055,.044,.036]}/>
  <Ball p={[.39,.37,-.28]} c="#f1c98f" s={[.21,.19,.47]}/>
  <Ball p={[0,.6,-.3]} c={level>23?'#bdacd9':level>9?'#e5bb8e':'#77aa91'} s={[.3,.31,.13]}/>
  <Ball p={[0,1.57,-.02]} c={level>23?'#e0ceef':level>9?'#e9c18f':'#82bf9e'} s={[.38,.09,.33]}/>
  <Ball p={[0,1.66,-.1]} c="#f6da9d" s={[.11,.07,.08]}/>
  <group ref={arm} position={[.41,.77,.15]}>
   <Ball p={[.02,-.1,.04]} c="#dba77e" s={[.14,.28,.15]}/>
   {tool!=='hand'&&<group position={[.15,-.07,.23]} rotation={[.23,0,-.27]}>
     <Stem p={[0,.03,0]} c="#a78364" h={.78} r={.045}/>
     {tool==='net'&&<><mesh position={[0,.53,0]} rotation={[Math.PI/2,0,0]}>
       <torusGeometry args={[.32,.05,8,20]}/><meshStandardMaterial color="#e9e1c8" roughness={.8}/></mesh>
       <Conic p={[0,.35,-.03]} c="#e7f1dc" h={.53} r={.28}/></>}
     {tool==='trowel'&&<Ball p={[0,.51,0]} c="#b4babe" s={[.15,.24,.055]}/>}
     {tool==='watering'&&<><Ball p={[0,.47,0]} c="#c5d9c3" s={[.28,.23,.2]}/>
       <Stem p={[.3,.54,0]} c="#a9c3ba" h={.38} r={.045}/></>}
     {tool==='rod'&&<><Stem p={[0,.73,0]} c="#ab9277" h={1.75} r={.027}/>
       <Ball p={[0,1.63,0]} c="#f0d8af" s={[.055,.055,.055]}/></>}
    </group>}
  </group>
  {[-.18,.18].map((x,i)=><group key={i} ref={r=>{if(r)legs.current[i]=r}}><Ball p={[x,.15,.1]} c="#c99375" s={[.18,.18,.2]}/></group>)}
  </group>
 </group>;
}
function ForestTree({x,z,foliage,season}:{x:number;z:number;foliage:string;season:number}){
 const crown=season%4===0?'#e7b6b2':season%4===1?'#b1ceac':foliage;
 return <group position={[x,0,z]}>
  <Stem p={[0,.75,0]} c="#9e7d65" h={1.4} r={.18}/>
  <Ball p={[0,1.73,0]} c={crown} s={[.65,.7,.6]}/>
  <Ball p={[-.37,1.44,.14]} c={foliage} s={[.49,.48,.49]}/>
  <Ball p={[.3,1.8,-.18]} c={season%3===1?'#c4d1a7':crown} s={[.44,.48,.44]}/>
  <Ball p={[.04,2.16,.04]} c={crown} s={[.43,.37,.45]}/>
 </group>;
}
function Landmark({region}:{region:Region}){
 const s=region.specialty;
 if(s==='academy')return <AcademyStructure/>;
 return <group position={[region.center[0],0,region.center[1]]}>
  <mesh position={[0,.14,0]}><cylinderGeometry args={[1.6,1.75,.24,16]}/><meshStandardMaterial color="#e6d8b9" roughness={1}/></mesh>
  {(s==='books'||s==='letters')&&<>
   <Box p={[0,.83,0]} c="#bfaa8e" s={[1.5,1.26,1.07]}/>
   <Box p={[0,1.52,-.08]} c={region.accent} s={[1.9,.27,1.38]}/>
   <WrittenPlaque title={s==='books'?'Wonder Lab':'Post Office'} size={.6}/>
  </>}
  {s==='rocks'&&[[-.7,.48,.1],[.3,.78,-.4],[.7,.3,.4]].map((p,i)=><mesh key={i} position={p as [number,number,number]} castShadow><dodecahedronGeometry args={[.56+i*.13,0]}/><meshStandardMaterial color={i%2?'#bb9580':'#e6c4a5'} flatShading roughness={1}/></mesh>)}
  {s==='ponds'&&<><Ball p={[0,.23,0]} c="#82c3c3" s={[1.48,.16,1.04]}/><Ball p={[-.5,.26,.24]} c="#a8bf8b" s={[.43,.07,.27]}/><Conic p={[.68,.71,0]} c="#d6bbc5" h={.98} r={.44}/></>}
  {s==='sails'&&<><Box p={[0,.53,0]} c="#c19b7c" s={[2.15,.22,.72]}/><Stem p={[0,1.59,0]} c="#9f9179" h={2.25} r={.09}/><mesh position={[.58,1.66,0]} rotation={[0,0,.3]}><coneGeometry args={[.88,1.62,3]}/><meshStandardMaterial color="#fff0d9" side={THREE.DoubleSide}/></mesh></>}
  {s==='cinema'&&<><Box p={[0,1.47,-.22]} c="#606b87" s={[2.8,1.9,.26]}/><Box p={[0,1.5,-.06]} c="#f7e9d1" s={[2.34,1.42,.06]}/><group position={[0,1.5,.04]}><WrittenPlaque title="Movie Matinee" size={.65} background="#544e6c"/></group></>}
  {s==='market'&&<><Box p={[0,.66,0]} c="#b18e75" s={[2,.26,1.25]}/><Conic p={[0,1.82,-.1]} c={region.accent} h={1.1} r={1.25}/><Ball p={[-.43,.94,.36]} c="#efc890" s={[.24,.18,.22]}/><Ball p={[.46,.94,.37]} c="#d9a2a4" s={[.22,.19,.23]}/></>}
  {s==='clocks'&&<><Stem p={[0,1.2,0]} c="#a98e78" h={2.15} r={.2}/><Ball p={[0,2.23,0]} c="#f6e5bb" s={[.7,.7,.2]}/><Stem p={[0,2.23,.24]} c="#9a806c" h={.5} r={.03}/></>}
  {s==='lanterns'&&<>{[-.67,0,.67].map((x,i)=><group key={i}><Stem p={[x,.84,0]} c="#a68975" h={1.57} r={.1}/><Ball p={[x,1.75,0]} c={i===1?'#f6d48b':region.accent} s={[.27,.4,.29]}/><Conic p={[x,2.13,0]} c="#b38d73" h={.26} r={.32}/></group>)}</>}
  {s==='stars'&&<><Stem p={[0,.82,0]} c="#9fabb3" h={1.4} r={.2}/><Ball p={[0,1.75,0]} c="#9badbe" s={[.8,.7,.63]}/><mesh position={[0,2.15,.27]} rotation={[.6,0,0]}><cylinderGeometry args={[.28,.52,1.39,10]}/><meshStandardMaterial color="#728ea2"/></mesh></>}
  {s==='hearts'&&<><Stem p={[0,.86,0]} c="#9e876a" h={1.5} r={.18}/><Ball p={[0,1.71,0]} c={region.accent} s={[.82,.71,.72]}/><Ball p={[-.45,1.47,.1]} c="#f8dbcb" s={[.45,.42,.39]}/><Ball p={[.4,1.53,-.08]} c="#efb9b9" s={[.46,.45,.41]}/></>}
 </group>;
}
function AcademyStructure(){
 const c=REGION_BY_WEEK.get(0)!.center;
 return <group position={[c[0],0,c[1]]}>
  <mesh rotation={[-Math.PI/2,0,0]} position={[0,.07,0]} receiveShadow><planeGeometry args={[6.5,5.7]}/><meshStandardMaterial color="#d8bd98" roughness={1}/></mesh>
  <Box p={[0,.49,-2.35]} c="#e9ddc6" s={[6.5,.86,.24]}/>
  <Box p={[-3.05,.45,0]} c="#e9ddc6" s={[.27,.8,4.7]}/>
  <Box p={[3.05,.45,0]} c="#e9ddc6" s={[.27,.8,4.7]}/>
  <Box p={[0,2.07,-2.52]} c="#f6e5c6" s={[6.65,.2,.45]}/>
  <Box p={[0,1.37,-2.19]} c="#5c8d81" s={[4.1,1.28,.16]}/>
  <Box p={[0,.8,-2.08]} c="#e4c9a5" s={[4.35,.12,.26]}/>
  <group position={[0,1.38,-1.99]}><WrittenPlaque title="Heartwood Academy" size={.96}/></group>
  {[-1.45,0,1.45].map((dx,i)=><group key={i}>
   <Box p={[dx,.58,.54]} c={i%2?'#e6cda9':'#d7ae8f'} s={[1.17,.19,.76]}/>
   <Stem p={[dx-.42,.29,.44]} c="#a98a73" h={.48} r={.07}/>
   <Stem p={[dx+.42,.29,.44]} c="#a98a73" h={.48} r={.07}/>
   <Box p={[dx,.35,1.35]} c="#e6d4b8" s={[1.14,.2,.34]}/>
  </group>)}
  {[-2.1,2.1].map(dx=><group key={dx}><Stem p={[dx,1.03,-1.8]} c="#af8f75" h={1.85} r={.14}/><Ball p={[dx,2.16,-1.8]} c="#f7d698" s={[.28,.36,.27]} emissive/></group>)}
  <Box p={[0,.12,2.5]} c="#f3e0be" s={[2.4,.12,1.3]}/>
  <group position={[0,1.4,2.65]}><WrittenPlaque title="Come on in!" size={.7}/></group>
 </group>;
}
function RegionalScenery({region}:{region:Region}){
 const trees=useMemo(()=>Array.from({length:9},(_,i)=>{
  const a=i*Math.PI*2/9+.32,rad=4.15+(i%3)*.2;
  return {x:region.center[0]+Math.cos(a)*rad,z:region.center[1]+Math.sin(a)*rad};
 }),[region]);
 const flowers=useMemo(()=>Array.from({length:10},(_,i)=>{
  const a=i*2.399,rad=2.9+(i%4)*.39;
  return [region.center[0]+Math.cos(a)*rad,region.center[1]+Math.sin(a)*rad] as const;
 }),[region]);
 return <group>
  <mesh rotation={[-Math.PI/2,0,0]} position={[region.center[0],.012,region.center[1]]} receiveShadow>
   <circleGeometry args={[5.5,32]}/><meshStandardMaterial color={region.color} roughness={1}/>
  </mesh>
  <mesh rotation={[-Math.PI/2,0,0]} position={[region.center[0],.025,region.center[1]]}>
   <planeGeometry args={[8.4,.9]}/><meshStandardMaterial color={region.path} roughness={.95}/>
  </mesh>
  <mesh rotation={[-Math.PI/2,0,0]} position={[region.center[0],.026,region.center[1]]}>
   <planeGeometry args={[.85,8.4]}/><meshStandardMaterial color={region.path} roughness={.95}/>
  </mesh>
  <Landmark region={region}/>
  {trees.map((p,i)=><ForestTree key={i} x={p.x} z={p.z} foliage={region.foliage} season={i+region.week}/>)}
  {flowers.map(([x,z],i)=><group key={i} position={[x,0,z]}>
   <Stem p={[0,.15,0]} c="#85a78a" h={.3} r={.03}/>
   <Ball p={[0,.3,0]} c={i%2===0?region.accent:'#fff1cf'} s={[.14,.13,.14]}/>
  </group>)}
  <group position={[region.center[0]+1.1,1.38,region.center[1]-3.25]}>
   <WrittenPlaque title={region.title} size={.81} background="#5f8373"/>
  </group>
 </group>;
}
const furnitureOffsets:Record<BuildingId,[number,number]>={
 'flower-bed':[-.55,2.9],'story-bench':[3.15,1.4],'picnic-table':[-2.1,-3.15],'lantern-arch':[-3.1,2.6]
};
function VillageFurniture({region,owned}:{region:Region;owned:string[]}){
 return <group>{(Object.keys(furnitureOffsets) as BuildingId[]).filter(id=>owned.includes(id)).map(id=>{
  const [dx,dz]=furnitureOffsets[id];
  return <group key={id} position={[region.center[0]+dx,0,region.center[1]+dz]}>
    {id==='flower-bed'&&<>
     <Box p={[0,.14,0]} c="#b58b72" s={[1,.23,.78]}/>
     <Box p={[0,.29,0]} c="#79a27c" s={[.86,.11,.67]}/>
     {[-.29,0,.29].map((x,i)=><group key={i}><Stem p={[x,.57,0]} c="#6f9d7b" h={.46} r={.037}/>
       <Ball p={[x,.8,0]} c={i%2?region.accent:'#ffedbc'} s={[.2,.18,.19]}/></group>)}
    </>}
    {id==='story-bench'&&<>
     <Box p={[0,.48,0]} c="#b48b6b" s={[1.45,.19,.57]}/>
     <Box p={[0,.89,-.21]} c="#cba181" s={[1.45,.74,.16]}/>
     {[-.49,.49].map(x=><Stem key={x} p={[x,.27,0]} c="#967e69" h={.5} r={.09}/>)}
     <Box p={[.25,.64,.04]} c="#f7edd8" s={[.4,.12,.33]}/>
    </>}
    {id==='picnic-table'&&<>
     <Box p={[0,.67,0]} c="#d1ae88" s={[1.35,.18,.9]}/>
     {[-.46,.46].map(x=><Stem key={x} p={[x,.34,0]} c="#9b856c" h={.58} r={.11}/>)}
     <Box p={[0,.77,0]} c="#fff2da" s={[.85,.04,.52]}/>
     <Ball p={[-.18,.87,.08]} c="#edb5a2" s={[.19,.14,.16]}/>
     <Ball p={[.2,.87,-.04]} c="#edcf8c" s={[.17,.14,.17]}/>
    </>}
    {id==='lantern-arch'&&<>
     {[-.6,.6].map(x=><group key={x}><Stem p={[x,.89,0]} c="#ac957d" h={1.55} r={.11}/>
       <Ball p={[x,1.56,.13]} c={region.accent} s={[.25,.33,.25]} emissive/></group>)}
     <Box p={[0,1.68,-.02]} c="#d2af87" s={[1.5,.21,.32]}/>
     <Ball p={[0,1.94,0]} c="#ffe8b8" s={[.22,.23,.17]}/>
    </>}
  </group>;
 })}</group>;
}
function VocabularySeed({week,index,position,color}:{week:number;index:number;position:[number,number];color:string}){
 const floating=useRef<Group>(null);
 useFrame(({clock})=>{
  if(!floating.current)return;
  const t=clock.getElapsedTime();floating.current.position.y=.53+Math.sin(t*1.6+index)*.11;
  floating.current.rotation.y=Math.sin(t*.6+week*2)*.3;
 });
 const click=(e:ThreeEvent<MouseEvent>)=>{
  e.stopPropagation();
  window.dispatchEvent(new CustomEvent('wildwood-travel',{detail:{x:position[0],z:position[1],seed:{week,index}}}));
 };
 return <group position={[position[0],0,position[1]]} onClick={click}>
  <mesh rotation={[-Math.PI/2,0,0]} position={[0,.08,0]}>
   <torusGeometry args={[.37,.049,7,18]}/><meshStandardMaterial color="#fff1b7" roughness={.7}/>
  </mesh>
  <group ref={floating} position={[0,.53,0]}>
   {Array.from({length:5},(_,i)=>{const a=i*Math.PI*2/5;
    return <Ball key={i} p={[Math.cos(a)*.18,Math.sin(a)*.18,0]} c={color} s={[.15,.17,.13]}/>})}
   <Ball p={[0,0,.12]} c="#fff1c1" s={[.17,.18,.14]} emissive/>
   <Ball p={[0,.38,0]} c="#fff9d9" s={[.06,.06,.06]} emissive/>
  </group>
 </group>;
}
function Flutterbug({color}:{color:string}){
 const bug=useRef<Group>(null),left=useRef<Group>(null),right=useRef<Group>(null);
 useFrame(({clock})=>{
  const t=clock.getElapsedTime();
  if(bug.current)bug.current.position.set(Math.sin(t*1.4)*.36,1.06+Math.sin(t*2.1)*.2,Math.cos(t*.9)*.3);
  if(left.current)left.current.rotation.y=Math.sin(t*17)*.85;
  if(right.current)right.current.rotation.y=-Math.sin(t*17)*.85;
 });
 return <group ref={bug}>
   <Ball p={[0,0,0]} c="#8e7767" s={[.095,.25,.11]}/>
   <group ref={left} position={[-.1,.05,0]}><Ball p={[-.23,.08,.02]} c={color} s={[.31,.27,.075]}/>
    <Ball p={[-.21,-.2,.01]} c="#f1e1b2" s={[.2,.21,.06]}/></group>
   <group ref={right} position={[.1,.05,0]}><Ball p={[.23,.08,.02]} c={color} s={[.31,.27,.075]}/>
    <Ball p={[.21,-.2,.01]} c="#f1e1b2" s={[.2,.21,.06]}/></group>
   <Stem p={[-.075,.26,0]} c="#876d60" h={.24} r={.014}/>
   <Stem p={[.075,.26,0]} c="#876d60" h={.24} r={.014}/>
  </group>;
}
function FieldProp({node,field,fish,highlight}:{node:FieldNode;field:FieldState;fish:FishRound|null;highlight:boolean}){
 const region=REGION_BY_WEEK.get(node.week)!;
 const status=available(node,field,Date.now());
 const used=status==='depleted';
 const garden=field.gardens[node.id];
 const onSelect=(e:ThreeEvent<MouseEvent>)=>{
  e.stopPropagation();
  window.dispatchEvent(new CustomEvent('wildwood-travel',{detail:{x:node.pos[0],z:node.pos[1],resourceId:node.id}}));
 };
 const plantHeight=status==='ready'?.75:status==='growing'?.37:.08;
 return <group position={[node.pos[0],0,node.pos[1]]} onClick={onSelect}>
  {highlight&&<mesh rotation={[-Math.PI/2,0,0]} position={[0,.045,0]}>
   <ringGeometry args={[.69,.75,26]}/><meshBasicMaterial color="#ffecaa" side={THREE.DoubleSide} transparent opacity={.88}/>
  </mesh>}
  {node.kind==='fruit'&&<group>
   <Ball p={[0,.35,0]} c="#739a7b" s={[.63,.48,.59]}/>
   <Ball p={[-.3,.55,-.1]} c="#8dae89" s={[.49,.44,.48]}/>
   <Ball p={[.29,.62,.16]} c="#95b889" s={[.46,.49,.5]}/>
   {!used&&[[-.39,.47,.38],[.16,.7,.49],[.45,.45,.37]].map((p,i)=><Ball key={i} p={p as [number,number,number]} c={i===1?'#e8a6a0':'#e5c27e'} s={[.14,.15,.14]}/>)}
  </group>}
  {node.kind==='bug'&&!used&&<Flutterbug color={region.accent}/>}
  {node.kind==='bug'&&used&&<><Ball p={[0,.15,0]} c="#a4c2a1" s={[.19,.14,.18]}/><Ball p={[.18,.1,-.07]} c="#d5c3b0" s={[.13,.11,.12]}/></>}
  {node.kind==='relic'&&<group>
   <Ball p={[0,.12,0]} c={used?'#bca994':'#b3a185'} s={[.75,.17,.6]}/>
   {!used&&<><Ball p={[-.19,.22,.08]} c="#d8c2a3" s={[.24,.2,.22]}/>
    <Ball p={[.27,.23,-.13]} c="#ccac8f" s={[.17,.13,.18]}/><Conic p={[0,.42,0]} c="#f2dba5" h={.35} r={.16}/></>}
  </group>}
  {node.kind==='garden'&&<group>
   <Box p={[0,.15,0]} c="#b38f76" s={[1.5,.24,1.11]}/>
   <Box p={[0,.3,0]} c={status==='growing'?'#7b9d7f':'#937a5c'} s={[1.29,.13,.93]}/>
   {garden&&[-.38,0,.38].map((x,i)=><group key={i}>
    <Stem p={[x,.43+plantHeight*.49,0]} c="#77a17c" h={plantHeight} r={.045}/>
    {plantHeight>.2&&<Ball p={[x,plantHeight+.42,0]} c={status==='ready'?region.accent:'#b2c5a0'}
      s={[status==='ready'?.26:.11,status==='ready'?.23:.12,.22]}/>}
    {status==='ready'&&<Ball p={[x,plantHeight+.43,.14]} c="#fff0b4" s={[.11,.13,.09]}/>}
   </group>)}
   <Box p={[0,.28,-.63]} c="#e2cfad" s={[.6,.36,.08]}/>
  </group>}
  {node.kind==='pond'&&<group>
   <mesh rotation={[-Math.PI/2,0,0]} position={[0,.071,0]}>
    <circleGeometry args={[1.3,32]}/><meshStandardMaterial color="#93c8c7" metalness={.08} roughness={.25}/>
   </mesh>
   {[.48,.83].map(r=><mesh key={r} rotation={[-Math.PI/2,0,0]} position={[0,.077,0]}>
    <ringGeometry args={[r,r+.027,30]}/><meshBasicMaterial color="#dbf5e1" transparent opacity={.5} side={THREE.DoubleSide}/>
   </mesh>)}
   {fish?.week===node.week&&<group position={[0,.16,0]}>
    <Ball p={[0,.15,0]} c={fish.phase==='bite'?'#f4bb93':'#f9e3b8'} s={[.12,.24,.12]}/>
    <Conic p={[0,.44,0]} c="#d98e88" h={.25} r={.11}/>
   </group>}
   <Ball p={[.89,.13,.59]} c="#a5bca1" s={[.27,.11,.18]}/>
  </group>}
  {node.kind!=='pond'&&node.kind!=='garden'&&<mesh position={[0,.64,0]} visible={false}>
   <cylinderGeometry args={[.85,.85,1.4,9]}/><meshBasicMaterial transparent opacity={0}/>
  </mesh>}
 </group>;
}
function ActionBurst({pulse,reduced}:{pulse:{serial:number;kind:string;pos:[number,number]};reduced:boolean}){
 const group=useRef<Group>(null),started=useRef(performance.now()/1000);
 useEffect(()=>{started.current=performance.now()/1000},[pulse.serial]);
 useFrame(()=>{
  if(!group.current)return;
  const t=Math.max(0,performance.now()/1000-started.current);
  group.current.visible=t<(reduced?.32:1.15);
  group.current.scale.setScalar(1+t*.9);
  group.current.position.y=.65+t*.7;
  group.current.rotation.y=t*.9;
  group.current.children.forEach(mesh=>{
   if(mesh instanceof THREE.Mesh){
    const m=mesh.material as THREE.MeshStandardMaterial;
    m.opacity=Math.max(0,1-t/1.15);
   }
  });
 });
 return <group key={pulse.serial} ref={group} position={[pulse.pos[0],.65,pulse.pos[1]]}>
  {Array.from({length:7},(_,i)=>{
   const angle=i/7*Math.PI*2,r=.38+(i%2)*.12;
   return <mesh key={i} position={[Math.cos(angle)*r,Math.sin(i*3)*.18,Math.sin(angle)*r]}>
    <dodecahedronGeometry args={[.09+(i%3)*.03,0]}/>
    <meshStandardMaterial transparent color={pulse.kind==='water'?'#a6e5e9':pulse.kind==='earth'?'#e1be94':pulse.kind==='heart'?'#efb9c4':'#ffe8a8'}
     emissive={pulse.kind==='heart'?'#b54d79':'#e8c383'} emissiveIntensity={.32}/>
   </mesh>;
  })}
 </group>;
}
function ChoiceMarker({index,position,style,onApproach}:{index:number;position:[number,number];style:WorldChallenge['style'];onApproach:(index:number)=>void}){
 const floating=useRef<Group>(null);
 useFrame(({clock})=>{if(floating.current){const t=clock.getElapsedTime();
  floating.current.position.y=1.02+Math.sin(t*2.4+index)*.13;
  floating.current.rotation.y=.2*Math.sin(t*.9+index);}});
 const colors=['#eab3be','#f3d092','#b4bbdd'];
 return <group position={[position[0],0,position[1]]} onClick={e=>{e.stopPropagation();onApproach(index)}}>
   <mesh position={[0,.11,0]} receiveShadow><cylinderGeometry args={[.65,.76,.22,16]}/><meshStandardMaterial color="#f2dfbd" roughness={1}/></mesh>
   <group ref={floating} position={[0,1.02,0]}>
    {style==='word'?<>
     <Stem p={[0,-.39,0]} c="#7bad85" h={.66} r={.1}/>
     {Array.from({length:6},(_,n)=>{const a=n*Math.PI/3;return <Ball key={n} p={[Math.cos(a)*.35,Math.sin(a)*.31,0]} c={colors[index]} s={[.22,.27,.19]}/>})}
     <Ball p={[0,0,.08]} c="#fff2b0" s={[.3,.3,.14]}/>
    </>:style==='story'?<>
     <Box p={[0,-.2,0]} c="#bd9a7c" s={[.78,.6,.36]}/>
     <Box p={[0,.13,.03]} c={colors[index]} s={[.85,.16,.45]}/>
     <Box p={[0,.29,.06]} c="#fff1df" s={[.55,.05,.36]}/>
    </>:<>
     <Stem p={[0,-.25,0]} c="#9a8269" h={1.05} r={.09}/>
     <Conic p={[.2,.15,0]} c={colors[index]} h={.85} r={.43}/>
    </>}
    <group position={[0,.58,.38]}><WrittenPlaque title={String.fromCharCode(65+index)} size={.4} background="#355d55"/></group>
   </group>
  </group>;
}
function ChallengeItems({challenge}:{challenge:WorldChallenge}){
 const approach=(index:number)=>{
  window.dispatchEvent(new CustomEvent('wildwood-travel',{detail:{
   x:challenge.anchor[0]+(index-1)*2.35,z:challenge.anchor[1]-2.3
  }}));
 };
 return <group>{[0,1,2].map(i=><ChoiceMarker index={i} key={i} style={challenge.style}
   position={[challenge.anchor[0]+(i-1)*2.35,challenge.anchor[1]-2.3]} onApproach={approach}/>)}</group>;
}
function Lanterns({count,anchor}:{count:number;anchor:[number,number]}){
 return <group>{Array.from({length:4},(_,i)=>{
  const x=anchor[0]+(i-1.5)*1.35,z=anchor[1]-2.2,lit=i<count;
  return <group key={i} position={[x,0,z]}>
   <Stem p={[0,.68,0]} c="#a89174" h={1.2} r={.12}/>
   <Ball p={[0,1.47,0]} c={lit?'#ffe4a6':'#a3b7b2'} s={[.32,.43,.31]} emissive={lit}/>
   {lit&&<pointLight position={[0,1.48,0]} intensity={1.12} distance={3} color="#ffdd91"/>}
  </group>;
 })}</group>;
}
function WanderController({input,active,regionWeek,reduced,worldPos,travel,challenge,actors,foundSeeds,tool,experience,onActor,onNearby,onMove,onCheckpoint,onRegion,onChallengeChoice,onSeed,onFieldUse,onVitals,onGamepadAction}:{
 input:RefObject<WalkInput>;active:boolean;regionWeek:number;reduced:boolean;worldPos:[number,number];travel:TravelCommand|null;
 challenge:WorldChallenge|null;actors:Actor[];foundSeeds:Record<string,boolean>;tool:ToolId;experience:number;
 onActor:(id:string)=>void;onNearby:(id:string|null)=>void;onMove:(x:number,z:number)=>void;onCheckpoint:(x:number,z:number)=>void;onRegion:(week:number)=>void;
 onChallengeChoice:(index:number)=>void;onSeed:(week:number,index:number)=>void;onFieldUse:(nodeId:string)=>void;
 onVitals:(vitals:Vitals)=>void;onGamepadAction:(action:'talk'|'use'|'bag'|'missions'|'cycle-forward'|'cycle-back')=>void;
}){
 const {camera,size,gl}=useThree();
 const pos=useRef(new THREE.Vector3(worldPos[0],0,worldPos[1]));
 const heading=useRef(0),walking=useRef(false),keys=useRef(new Set<string>());
 const mode=useRef<PlayerMode>('idle'),jumpY=useRef(0),verticalVelocity=useRef(0),
  dodgeTime=useRef(0),dodgeCooldown=useRef(0),lastJumpSerial=useRef(0),lastDodgeSerial=useRef(0),
  stamina=useRef(100),lastVitals=useRef(0),lastSneak=useRef(0),lastSprint=useRef(0),
  actionTime=useRef(-20),lastActionSerial=useRef(0);
 const velocity=useRef(new THREE.Vector2()),cameraYaw=useRef(.68),cameraPitch=useRef(.93),cameraDistance=useRef(11),
  previousGamepad=useRef(new Set<number>()),gamepadAxis=useRef({x:0,z:0});
 const drag=useRef<{id:number;lastX:number;lastY:number;originX:number;originY:number;started:boolean}|null>(null);
 const suppressGroundUntil=useRef(0);
 const cameraPos=useRef(new THREE.Vector3()),cameraTarget=useRef(new THREE.Vector3());
 const goal=useRef<Trip|null>(null),lastUi=useRef(0),lastSave=useRef(0),lastFoot=useRef(0),distanceTravelled=useRef(0);
 const lastNearby=useRef<string|null>(null),lastRegion=useRef(regionWeek),choiceArmed=useRef(true);
 const wasWalking=useRef(false);
 const seedArmed=useRef<Record<string,boolean>>({});
 const sceneColor=useRef(new THREE.Color('#deeadf')),skyColor=useRef(new THREE.Color('#deeadf')),
  cameraLook=useRef(new THREE.Vector3(pos.current.x,.35,pos.current.z));
 useEffect(()=>{
  if(!travel)return;
  goal.current={x:travel.x,z:travel.z,actorId:travel.actorId,seed:travel.seed,resourceId:travel.resourceId};
 },[travel]);
 useEffect(()=>{
  const el=gl.domElement;
  const down=(e:PointerEvent)=>{
   if(!active)return;
   if(e.button===2||e.pointerType==='touch'){
    drag.current={id:e.pointerId,lastX:e.clientX,lastY:e.clientY,originX:e.clientX,originY:e.clientY,started:false};
    if(e.button===2){el.setPointerCapture(e.pointerId);e.preventDefault()}
   }
  };
  const move=(e:PointerEvent)=>{
   const current=drag.current;
   if(!current||e.pointerId!==current.id)return;
   const dx=e.clientX-current.lastX,dy=e.clientY-current.lastY;
   if(Math.hypot(e.clientX-current.originX,e.clientY-current.originY)>7)current.started=true;
   if(current.started){cameraYaw.current-=dx*.008;cameraPitch.current=THREE.MathUtils.clamp(cameraPitch.current+dy*.007,.42,1.31)}
   current.lastX=e.clientX;current.lastY=e.clientY;
  };
  const end=(e:PointerEvent)=>{
   if(drag.current?.id===e.pointerId){
    if(drag.current.started)suppressGroundUntil.current=performance.now()+280;
    drag.current=null;
   }
  };
  const wheel=(e:WheelEvent)=>{if(!active)return;e.preventDefault();
   cameraDistance.current=THREE.MathUtils.clamp(cameraDistance.current+Math.sign(e.deltaY)*.86,7.3,18)};
  const context=(e:MouseEvent)=>e.preventDefault();
  el.addEventListener('pointerdown',down);el.addEventListener('pointermove',move);
  el.addEventListener('pointerup',end);el.addEventListener('pointercancel',end);
  el.addEventListener('wheel',wheel,{passive:false});el.addEventListener('contextmenu',context);
  return()=>{
   el.removeEventListener('pointerdown',down);el.removeEventListener('pointermove',move);
   el.removeEventListener('pointerup',end);el.removeEventListener('pointercancel',end);
   el.removeEventListener('wheel',wheel);el.removeEventListener('contextmenu',context);
  };
 },[gl,active]);
 useEffect(()=>{
  const recenter=()=>{cameraYaw.current=.68;cameraPitch.current=.93;cameraDistance.current=11};
  window.addEventListener('wildwood-camera-recenter',recenter);
  return()=>window.removeEventListener('wildwood-camera-recenter',recenter);
 },[]);
 useEffect(()=>{if(!challenge)choiceArmed.current=true},[challenge?.id]);
 useEffect(()=>{
  const editable=(target:EventTarget|null)=>target instanceof HTMLElement&&Boolean(target.closest('input,textarea,select,[contenteditable="true"]'));
  const down=(e:KeyboardEvent)=>{
   if(editable(e.target)||!active)return;
   const key=e.key.toLowerCase();
   if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(key))e.preventDefault();
   keys.current.add(key);
   if((key==='e'||key==='enter')&&lastNearby.current){onActor(lastNearby.current);goal.current=null;}
  };
  const up=(e:KeyboardEvent)=>keys.current.delete(e.key.toLowerCase());
  const blur=()=>keys.current.clear();
  window.addEventListener('keydown',down);
  window.addEventListener('keyup',up);
  window.addEventListener('blur',blur);
  return()=>{window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',blur)};
 },[active,onActor]);
 const requestTarget=useCallback((x:number,z:number,actorId?:string)=>{
  // Queue a destination even while a journal is finishing its close
  // transition. The frame controller alone determines when walking resumes.
  // Otherwise a same-tick Close → click-to-walk loses its action.
  goal.current={x:THREE.MathUtils.clamp(x,WORLD_BOUNDS.minX+1,WORLD_BOUNDS.maxX-1),
    z:THREE.MathUtils.clamp(z,WORLD_BOUNDS.minZ+1,WORLD_BOUNDS.maxZ-1),actorId};
 },[]);
 useEffect(()=>{
  const select=(event:Event)=>{
   const custom=event as CustomEvent<{x:number;z:number;actorId?:string;seed?:{week:number;index:number};resourceId?:string}>;
   if(custom.detail){
     requestTarget(custom.detail.x,custom.detail.z,custom.detail.actorId);
     if(custom.detail.seed&&goal.current)goal.current.seed=custom.detail.seed;
     if(custom.detail.resourceId&&goal.current)goal.current.resourceId=custom.detail.resourceId;
   }
  };
  window.addEventListener('wildwood-travel',select);
  return()=>window.removeEventListener('wildwood-travel',select);
 },[requestTarget]);
 useFrame((state,dt)=>{
  const t=state.clock.getElapsedTime(),step=Math.min(dt,.09);
  const k=keys.current,dir=input.current;
  const pad=navigator.getGamepads?.()[0];
  gamepadAxis.current.x=pad&&Math.abs(pad.axes[0]||0)>.18?pad.axes[0]:0;
  gamepadAxis.current.z=pad&&Math.abs(pad.axes[1]||0)>.18?pad.axes[1]:0;
  if(pad){
   if(Math.abs(pad.axes[2]||0)>.17)cameraYaw.current-=(pad.axes[2]||0)*step*1.6;
   if(Math.abs(pad.axes[3]||0)>.17)cameraPitch.current=THREE.MathUtils.clamp(cameraPitch.current+(pad.axes[3]||0)*step, .42,1.31);
   for(const [idx,command] of [[2,'talk'],[3,'use'],[4,'cycle-back'],[5,'cycle-forward'],[8,'bag'],[9,'missions']] as const){
    if(pad.buttons[idx]?.pressed&&!previousGamepad.current.has(idx)){previousGamepad.current.add(idx);onGamepadAction(command)}
    if(!pad.buttons[idx]?.pressed)previousGamepad.current.delete(idx);
   }
   if(pad.buttons[0]?.pressed&&!previousGamepad.current.has(0)){dir.jumpSerial++;previousGamepad.current.add(0)}
   if(!pad.buttons[0]?.pressed)previousGamepad.current.delete(0);
   if(pad.buttons[1]?.pressed&&!previousGamepad.current.has(1)){dir.dodgeSerial++;previousGamepad.current.add(1)}
   if(!pad.buttons[1]?.pressed)previousGamepad.current.delete(1);
  }
  let dx=Number(k.has('d')||k.has('arrowright'))-Number(k.has('a')||k.has('arrowleft'))+dir.x+gamepadAxis.current.x;
  let dz=Number(k.has('s')||k.has('arrowdown'))-Number(k.has('w')||k.has('arrowup'))+dir.z+gamepadAxis.current.z;
  const manual=Math.hypot(dx,dz);
  // Movement follows the orbiting camera, as in an actual third-person game.
  // Point-and-click travel remains an independent world-space destination.
  if(manual>.06){
   const right=Math.cos(cameraYaw.current),forward=Math.sin(cameraYaw.current);
   const worldX=dx*right+dz*forward,worldZ=-dx*forward+dz*right;
   dx=worldX;dz=worldZ;
  }
  if(manual>.06)goal.current=null;
  const target=goal.current;
  if(active&&manual<=.06&&target){
   const d=Math.hypot(target.x-pos.current.x,target.z-pos.current.z);
   if(d<(target.actorId?1.18:target.resourceId?1.48:target.seed?.4:.18)){
    goal.current=null;
    if(target.actorId)onActor(target.actorId);
    else if(target.resourceId)onFieldUse(target.resourceId);
    else if(target.seed){
     const key=target.seed.week+'.'+target.seed.index;
     seedArmed.current[key]=false;
     onSeed(target.seed.week,target.seed.index);
    }
   }else{dx=(target.x-pos.current.x)/d;dz=(target.z-pos.current.z)/d}
  }
  if(active&&dir.jumpSerial!==lastJumpSerial.current){
   lastJumpSerial.current=dir.jumpSerial;
   if(jumpY.current===0&&stamina.current>=8){verticalVelocity.current=5.2;stamina.current-=8;academySound.play('hop-takeoff')}
  }
  if(active&&dir.dodgeSerial!==lastDodgeSerial.current){
   lastDodgeSerial.current=dir.dodgeSerial;
   if(dodgeCooldown.current<=0&&stamina.current>=22){
    stamina.current-=22;dodgeTime.current=.34;dodgeCooldown.current=1.4;academySound.play('dodge-roll')}
  }
  if(dir.actionSerial!==lastActionSerial.current){lastActionSerial.current=dir.actionSerial;actionTime.current=t}
  if(jumpY.current>0||verticalVelocity.current>0){
   jumpY.current=Math.max(0,jumpY.current+verticalVelocity.current*step);
   verticalVelocity.current-=16.5*step;
   if(jumpY.current===0&&verticalVelocity.current<0){verticalVelocity.current=0;academySound.play('hop-land',{intensity:.6})}
  }
  dodgeTime.current=Math.max(0,dodgeTime.current-step);
  dodgeCooldown.current=Math.max(0,dodgeCooldown.current-step);
  const sneak=active&&(k.has('control')||dir.sneak||Boolean(pad?.buttons[10]?.pressed));
  const sprint=active&&!sneak&&stamina.current>0&&(k.has('shift')||dir.run||Boolean(pad?.buttons[7]?.pressed));
  const speed=sneak?1.55:sprint?5.85:dodgeTime.current>0?8.25:Boolean(target)?4.55:3.45;
  const magnitude=Math.hypot(dx,dz);
  walking.current=active&&(magnitude>.04||dodgeTime.current>0);
  if(sprint&&walking.current){
   stamina.current=Math.max(0,stamina.current-15*step);
   if(t-lastSprint.current>1.3){lastSprint.current=t;academySound.play('dash-boost',{intensity:.35})}
  }else stamina.current=Math.min(100,stamina.current+(walking.current?11:18)*step);
  if(sneak&&walking.current&&t-lastSneak.current>1.5){lastSneak.current=t;academySound.play('sneak-rustle',{intensity:.24})}
  // An air-dodge remains a dodge for its brief follow-through, rather than
  // being silently masked by the longer jump animation.
  mode.current=dodgeTime.current>0?'dodge':jumpY.current>0?'jump':sneak?'sneak':!walking.current?'idle':sprint?'run':'walk';
  if(t-lastVitals.current>.18){lastVitals.current=t;onVitals({stamina:stamina.current,mode:mode.current,facing:heading.current})}
  if(walking.current&&!wasWalking.current)academySound.play('move-start',{intensity:.35});
  wasWalking.current=walking.current;
  if(walking.current){
   dx/=Math.max(1,magnitude);dz/=Math.max(1,magnitude);
   if(dodgeTime.current>0&&magnitude<=.04){dx=Math.sin(heading.current);dz=Math.cos(heading.current)}
   velocity.current.lerp(new THREE.Vector2(dx*speed,dz*speed),1-Math.exp(-step*11.5));
   const nx=THREE.MathUtils.clamp(pos.current.x+velocity.current.x*step,WORLD_BOUNDS.minX,WORLD_BOUNDS.maxX);
   const nz=THREE.MathUtils.clamp(pos.current.z+velocity.current.y*step,WORLD_BOUNDS.minZ,WORLD_BOUNDS.maxZ);
   const moved=Math.hypot(nx-pos.current.x,nz-pos.current.z);
   pos.current.set(nx,0,nz);
   distanceTravelled.current+=moved;
   const desired=Math.atan2(dx,dz);
   heading.current+=Math.atan2(Math.sin(desired-heading.current),Math.cos(desired-heading.current))*(1-Math.exp(-step*11));
   const region=closestRegion(nx,nz);
   if(jumpY.current===0&&distanceTravelled.current-lastFoot.current>(sneak?1.2:sprint?.74:1.02)){
     academySound.play(region.week===0?'foot-wood':'foot-grass',{intensity:sneak?.18:sprint?.8:.48,exclusive:false});
     lastFoot.current=distanceTravelled.current;
   }
  }else velocity.current.multiplyScalar(1-Math.min(.95,step*12));
  const aspect=size.width/Math.max(1,size.height);
  const baseDistance=aspect<.78?12.7:aspect<1.35?11.4:10.1;
  const fov=aspect<.78?48:42;
  if(camera instanceof THREE.PerspectiveCamera&&Math.abs(camera.fov-fov)>.3){camera.fov=fov;camera.updateProjectionMatrix()}
  const distance=cameraDistance.current+(baseDistance-11);
  const expected=cameraPos.current.set(
   pos.current.x+Math.sin(cameraYaw.current)*Math.sin(cameraPitch.current)*distance,
   Math.cos(cameraPitch.current)*distance+2.1,
   pos.current.z+Math.cos(cameraYaw.current)*Math.sin(cameraPitch.current)*distance);
  const alpha=1-Math.exp(-step*(reduced?9:5.8));
  camera.position.lerp(expected,alpha);
  cameraLook.current.lerp(cameraTarget.current.set(pos.current.x,.66+jumpY.current*.3,pos.current.z-.16),alpha);
  camera.lookAt(cameraLook.current);
  const region=closestRegion(pos.current.x,pos.current.z);
  const sky=region.sky;sceneColor.current.lerp(skyColor.current.set(sky),1-Math.exp(-step*.85));
  state.scene.background=sceneColor.current;
  if(state.scene.fog instanceof THREE.Fog)state.scene.fog.color.copy(sceneColor.current);
  if(region.week!==lastRegion.current){lastRegion.current=region.week;onRegion(region.week);if(region.week===0)academySound.play('classroom-door')}
  if(active&&t-lastUi.current>.19){
   lastUi.current=t;onMove(pos.current.x,pos.current.z);
   let near:string|null=null,d=1.55;
   for(const actor of actors){
    const dist=Math.hypot(actor.position[0]-pos.current.x,actor.position[1]-pos.current.z);
    if(dist<d){near=actor.id;d=dist}
   }
   if(lastNearby.current!==near){lastNearby.current=near;onNearby(near)}
  }
  if(t-lastSave.current>2.8){lastSave.current=t;onCheckpoint(pos.current.x,pos.current.z)}
  if(active&&!goal.current&&!challenge){
   // Collectible triggers are rearmed only after the player has walked away,
   // so dismissing a word-puzzle can't immediately reopen it.
   for(const region of zonesNear(pos.current.x,pos.current.z)){
    if(region.week===0)continue;
    for(let i=0;i<SEED_OFFSETS.length;i++){
     const key=region.week+'.'+i;
     if(foundSeeds[key])continue;
     const point=seedPoint(region.week,i);
     const distance=Math.hypot(point[0]-pos.current.x,point[1]-pos.current.z);
     if(distance>1.1)seedArmed.current[key]=true;
     if(distance<.46&&seedArmed.current[key]!==false){
      seedArmed.current[key]=false;onSeed(region.week,i);return;
     }
    }
   }
  }
  if(active&&challenge&&challenge.id){
   const index=[0,1,2].find(i=>Math.hypot(challenge.anchor[0]+(i-1)*2.35-pos.current.x,challenge.anchor[1]-2.3-pos.current.z)<.77);
   if(index===undefined)choiceArmed.current=true;
   if(index!==undefined&&choiceArmed.current){
    choiceArmed.current=false;goal.current=null;onChallengeChoice(index);
   }
  }
 });
 const onGround=(e:ThreeEvent<MouseEvent>)=>{
  if(!active||drag.current?.started||performance.now()<suppressGroundUntil.current)return;
  requestTarget(e.point.x,e.point.z);
 };
 return <>
  <YourCharacter pos={pos} heading={heading} walking={walking} reduced={reduced} level={levelForXp(experience)}
   tool={tool} jumpY={jumpY} mode={mode} actionTime={actionTime}/>
  <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.03,0]} receiveShadow onClick={onGround}>
   <planeGeometry args={[64,44]}/><meshStandardMaterial color="#bcd7af" roughness={1}/>
  </mesh>
 </>;
}
function WorldCanvas({props,visible}: {props:WorldSceneProps;visible:boolean}){
 const [webgl,setWebgl]=useState<boolean|null>(null);
 useEffect(()=>{try{const c=document.createElement('canvas');setWebgl(Boolean(c.getContext('webgl2')||c.getContext('webgl')))}catch{setWebgl(false)}},[]);
 const [lastPage,setLastPage]=useState(!document.hidden);
 useEffect(()=>{const listener=()=>setLastPage(!document.hidden);document.addEventListener('visibilitychange',listener);return()=>document.removeEventListener('visibilitychange',listener)},[]);
 const visibleActors=useMemo(()=>props.availableActors,[props.availableActors]);
 if(webgl===false)return <div className="ww-2d-world" role="region" aria-label="Woodland school map">
  <p>Illustrated map mode is active. All classroom and student activities remain available.</p>
  <div className="ww-2d-equipment" role="group" aria-label="Equip a field tool">
    {TOOL_IDS.map(id=><button key={id} onClick={()=>props.onEquip(id)} aria-pressed={props.tool===id}
      aria-label={'Equip '+TOOL_META[id].name+' ('+TOOL_META[id].key+')'}>
      <strong>{TOOL_META[id].key}</strong>{TOOL_META[id].name}</button>)}
  </div>
  <div className="ww-2d-utility">
   <button onClick={()=>props.onGamepadAction('bag')}>Open my satchel</button>
   <button onClick={()=>props.onGamepadAction('missions')}>Daily adventures</button>
  </div>
  <div className="ww-2d-map">{REGIONS.map(region=><button key={region.week} onClick={()=>window.dispatchEvent(new CustomEvent('wildwood-location',{detail:{week:region.week}}))}>{region.week===0?'Academy':region.title}</button>)}</div>
  <div className="ww-2d-peers">{visibleActors.map(actor=><div key={actor.id} className="ww-2d-peer-card">
   <button onClick={()=>props.onActor(actor.id)}>{actor.name} · {actor.role}</button>
   {actor.role==='student'&&<button aria-label={'Give bouquet to '+actor.name}
    onClick={()=>props.onGiveActor(actor.id)}>Give gift</button>}
  </div>)}</div>
  {props.regionWeek>0&&<div className="ww-2d-seeds" role="group" aria-label="Find vocabulary seeds">
   {SEED_OFFSETS.map((_,index)=>!props.foundSeeds[props.regionWeek+'.'+index]&&
     <button key={index} onClick={()=>props.onSeed(props.regionWeek,index)}>Discover word seed {index+1}</button>)}
  </div>}
  <div className="ww-2d-field" role="group" aria-label="Playable field activities">
   {resourceNodes(props.regionWeek).map(node=><button key={node.id}
     onClick={()=>props.onFieldUse(node.id)}>
    {node.name} · {available(node,props.field,Date.now())}
   </button>)}
  </div>
 </div>;
 return <Canvas dpr={[1,Math.min(devicePixelRatio,innerWidth<600?1.1:1.4)]}
  shadows={innerWidth>=800} frameloop={visible&&lastPage?'always':'demand'}
  gl={{antialias:true,powerPreference:'high-performance',alpha:false}}
  camera={{position:[8,11,13],near:.1,far:100,fov:44}}
  onCreated={({gl})=>{gl.domElement.addEventListener('webglcontextlost',()=>setWebgl(false),{once:true})}}>
   <fog attach="fog" args={['#dceadf',20,43]}/>
   <ambientLight intensity={1.35}/>
   <hemisphereLight args={['#fff3dd','#739485',1.85]}/>
   <directionalLight position={[9,17,11]} intensity={2} color="#fff1d7" castShadow={innerWidth>=800}
    shadow-mapSize-width={1024} shadow-mapSize-height={1024} shadow-camera-left={-26} shadow-camera-right={26}
    shadow-camera-top={23} shadow-camera-bottom={-23}/>
   {zonesNear(props.worldPos[0],props.worldPos[1]).map(region=><RegionalScenery key={region.week} region={region}/>)}
   {zonesNear(props.worldPos[0],props.worldPos[1]).filter(region=>region.week>0).map(region=><group key={'decor-'+region.week}>
     <VillageFurniture region={region} owned={props.decorations[String(region.week)]||[]}/>
     {SEED_OFFSETS.map((_,index)=>!props.foundSeeds[region.week+'.'+index]&&<VocabularySeed key={index}
       week={region.week} index={index} position={seedPoint(region.week,index)} color={region.accent}/>)}
   </group>)}
   {zonesNear(props.worldPos[0],props.worldPos[1]).flatMap(region=>resourceNodes(region.week)).map(node=>
    <FieldProp key={node.id} node={node} field={props.field} fish={props.fish}
     highlight={Math.hypot(props.worldPos[0]-node.pos[0],props.worldPos[1]-node.pos[1])<2.45}/>)}
   {visibleActors.map(actor=><ActorInstance actor={actor} key={actor.id} friendship={props.field.friends[actor.id]||0}
      onSelect={id=>window.dispatchEvent(new CustomEvent('wildwood-actor',{detail:{id}}))}/>)}
   {props.actionPulse&&<ActionBurst pulse={props.actionPulse} reduced={props.reduced}/>}
   {props.challenge&&<ChallengeItems challenge={props.challenge}/>}
   {props.lanterns>0&&<Lanterns count={props.lanterns} anchor={props.worldPos}/>}
   <WanderController worldPos={props.worldPos} regionWeek={props.regionWeek} input={props.input}
     active={props.active} reduced={props.reduced} travel={props.travel} challenge={props.challenge} tool={props.tool} experience={props.field.xp}
     actors={visibleActors} foundSeeds={props.foundSeeds} onSeed={props.onSeed} onFieldUse={props.onFieldUse}
     onActor={props.onActor} onNearby={props.onNearby} onMove={props.onMove}
     onCheckpoint={props.onCheckpoint} onRegion={props.onRegion} onChallengeChoice={props.onChallengeChoice}
     onVitals={props.onVitals} onGamepadAction={props.onGamepadAction}/>
  </Canvas>;
}
export default memo(function WorldScene(props:WorldSceneProps){
 const host=useRef<HTMLDivElement>(null),[visible,setVisible]=useState(true);
 useEffect(()=>{
  if(!host.current||!('IntersectionObserver' in window))return;
  const observer=new IntersectionObserver(entries=>setVisible(Boolean(entries[0]?.isIntersecting)),{threshold:.01});
  observer.observe(host.current);return()=>observer.disconnect();
 },[]);
 const actors=useMemo(()=>{
  const regions=zonesNear(props.worldPos[0],props.worldPos[1]).map(r=>r.week);
  return ALL_ACTORS.filter(actor=>regions.includes(actor.week));
 },[props.regionWeek,Math.round(props.worldPos[0]/7),Math.round(props.worldPos[1]/7)]);
 const handleClicked=useCallback((e:Event)=>{
  const detail=(e as CustomEvent<{id:string}>).detail;
  const actor=ACTOR_BY_ID.get(detail.id);
  if(actor&&props.active){
   window.dispatchEvent(new CustomEvent('wildwood-travel',{detail:{x:actor.position[0],z:actor.position[1],actorId:actor.id}}));
  }
 },[props.active]);
 useEffect(()=>{window.addEventListener('wildwood-actor',handleClicked);return()=>window.removeEventListener('wildwood-actor',handleClicked)},[handleClicked]);
 return <div className="ww-canvas" ref={host}>
  <WorldCanvas props={{...props,availableActors:actors}} visible={visible}/>
 </div>;
});
