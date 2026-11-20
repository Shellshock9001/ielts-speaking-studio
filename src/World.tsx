import { Canvas, ThreeEvent, useFrame, useThree } from '@react-three/fiber';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type { Group } from 'three';
import type { Station } from './data';
import { stationMeta } from './data';

type Props={station:Station|null; onSelect:(station:Station)=>void; reduced:boolean; active:boolean; growth:number};
type Point=[number,number,number];
const STATION_POSITION:Record<Station,Point>={garden:[-3.1,.25,1.5],story:[-.95,.22,-1.0],speak:[1.55,.22,1.35],debate:[3.3,.22,-1.15]};
function Matte({color,roughness=.9}:{color:string;roughness?:number}){return <meshStandardMaterial color={color} roughness={roughness} metalness={0} flatShading/>;}
function Sphere({pos,scale=[1,1,1],color}:{pos:Point;scale?:Point;color:string}){return <mesh position={pos} scale={scale} castShadow receiveShadow><sphereGeometry args={[1,20,14]}/><Matte color={color}/></mesh>;}
function Cylinder({pos,scale=[1,1,1],color,rotation}:{pos:Point;scale?:Point;color:string;rotation?:Point}){return <mesh position={pos} rotation={rotation} scale={scale} castShadow receiveShadow><cylinderGeometry args={[1,1,1,12]}/><Matte color={color}/></mesh>;}
function Tree({pos,size=1,blossom=false}:{pos:Point;size?:number;blossom?:boolean}){return <group position={pos} scale={size}>
  <Cylinder pos={[0,.43,0]} scale={[.14,.9,.14]} color="#81694d"/>
  <Sphere pos={[0,1.12,0]} scale={[.56,.48,.53]} color={blossom?'#eab7c3':'#6fa18b'}/>
  <Sphere pos={[-.26,.92,.11]} scale={[.47,.45,.48]} color={blossom?'#f2ced4':'#8cb999'}/>
  <Sphere pos={[.34,1.03,-.07]} scale={[.45,.46,.45]} color={blossom?'#d994ad':'#729f83'}/>
  <Sphere pos={[.03,1.48,.06]} scale={[.4,.36,.42]} color={blossom?'#f3c9cf':'#97be9e'}/>
</group>;}
function Flower({pos,pink=false}:{pos:Point;pink?:boolean}){return <group position={pos}>
<Cylinder pos={[0,.1,0]} scale={[.018,.22,.018]} color="#537b5a"/>
{Array.from({length:5},(_,i)=>{const a=i*Math.PI*2/5;return <Sphere key={i} pos={[Math.cos(a)*.11,.26,Math.sin(a)*.11]} scale={[.105,.045,.088]} color={pink?'#f2b2c1':'#f9d678'}/>;})}
<Sphere pos={[0,.28,0]} scale={[.068,.06,.068]} color={pink?'#eea0a0':'#b76b43'}/>
</group>;}
function Animal({kind,pos,enabled=true}:{kind:'fox'|'owl'|'bunny';pos:Point;enabled?:boolean}) {
  const ref=useRef<Group>(null);
  const colors={fox:{body:'#c98561',face:'#ecb283',ear:'#9b604f',top:'#5c8990'},owl:{body:'#c4a78b',face:'#fff0d6',ear:'#886f6b',top:'#778cba'},bunny:{body:'#e6d5c2',face:'#fff3e0',ear:'#c5a99f',top:'#d99aaa'}}[kind];
  useFrame(({clock})=>{if(!ref.current||!enabled)return;const t=clock.getElapsedTime();ref.current.position.y=pos[1]+.05*Math.sin(t*1.5+(kind==='owl'?1:0));ref.current.rotation.y=.09*Math.sin(t*.65+(kind==='bunny'?2:0));});
  return <group ref={ref} position={pos} scale={kind==='owl'?.83:1}>
    <Sphere pos={[0,.37,0]} scale={[.32,.39,.28]} color={colors.body}/>
    <Sphere pos={[0,.31,.2]} scale={[.255,.29,.13]} color={colors.top}/>
    <Sphere pos={[0,.86,.045]} scale={[.44,.39,.4]} color={colors.body}/>
    {kind==='fox'?<><mesh position={[-.28,1.14,.02]} rotation={[0,0,-.22]} castShadow><coneGeometry args={[.2,.43,4]}/><Matte color={colors.ear}/></mesh><mesh position={[.28,1.14,.02]} rotation={[0,0,.22]} castShadow><coneGeometry args={[.2,.43,4]}/><Matte color={colors.ear}/></mesh></>:kind==='bunny'?<><Sphere pos={[-.2,1.33,-.02]} scale={[.13,.43,.13]} color={colors.body}/><Sphere pos={[.2,1.33,-.02]} scale={[.13,.43,.13]} color={colors.body}/><Sphere pos={[-.2,1.34,.08]} scale={[.065,.32,.03]} color="#e6b4b9"/><Sphere pos={[.2,1.34,.08]} scale={[.065,.32,.03]} color="#e6b4b9"/></>:<><Sphere pos={[-.29,1.11,0]} scale={[.12,.22,.16]} color={colors.ear}/><Sphere pos={[.29,1.11,0]} scale={[.12,.22,.16]} color={colors.ear}/></>}
    <Sphere pos={[-.16,.9,.38]} scale={[.17,.19,.12]} color={colors.face}/><Sphere pos={[.16,.9,.38]} scale={[.17,.19,.12]} color={colors.face}/>
    <Sphere pos={[-.145,.93,.495]} scale={[.067,.08,.04]} color="#273c46"/><Sphere pos={[.145,.93,.495]} scale={[.067,.08,.04]} color="#273c46"/>
    <Sphere pos={[-.12,.97,.531]} scale={[.021,.024,.01]} color="#fffef6"/><Sphere pos={[.17,.97,.531]} scale={[.021,.024,.01]} color="#fffef6"/>
    <Sphere pos={[0,.77,.47]} scale={[.11,.085,.085]} color={kind==='fox'?'#fff0dd':colors.face}/>
    <Sphere pos={[0,.79,.55]} scale={[.044,.035,.025]} color={kind==='bunny'?'#df9d9b':'#996b56'}/>
    <Sphere pos={[-.38,.39,.01]} scale={[.12,.28,.14]} color={colors.body}/><Sphere pos={[.38,.39,.01]} scale={[.12,.28,.14]} color={colors.body}/>
    <Sphere pos={[-.16,.04,.09]} scale={[.18,.09,.2]} color={colors.ear}/><Sphere pos={[.16,.04,.09]} scale={[.18,.09,.2]} color={colors.ear}/>
    {kind==='fox'?<Sphere pos={[.33,.22,-.21]} scale={[.27,.25,.46]} color="#e8b77e"/>:null}
  </group>;
}
function Cottage({onSelect,selected}:{onSelect:()=>void;selected:boolean}){
 const click=(e:ThreeEvent<MouseEvent>)=>{e.stopPropagation();onSelect();};
 return <group position={STATION_POSITION.story} onClick={click}>
   <mesh position={[0,.53,0]} castShadow receiveShadow><boxGeometry args={[2,1.27,1.52]}/><Matte color="#ffead0"/></mesh>
   <mesh position={[0,1.39,0]} rotation={[0,0,0]} castShadow><coneGeometry args={[1.67,.95,4]}/><Matte color={selected?'#df9a8d':'#c8897e'}/></mesh>
   <mesh position={[0,.28,.8]} castShadow><boxGeometry args={[.48,.72,.08]}/><Matte color="#ad7f69"/></mesh>
   <Sphere pos={[.09,.27,.85]} scale={[.035,.035,.035]} color="#f9d487"/>
   {[-.57,.55].map(x=><group key={x}><mesh position={[x,.61,.78]}><boxGeometry args={[.38,.35,.08]}/><Matte color="#8cb9b1"/></mesh><mesh position={[x,.61,.83]}><boxGeometry args={[.055,.35,.015]}/><Matte color="#fff6e4"/></mesh></group>)}
   <Cylinder pos={[.63,1.92,-.1]} scale={[.16,.62,.16]} color="#e0b896"/>
   <Sphere pos={[0,-.11,1.1]} scale={[1.2,.08,.8]} color={selected?'#f5d6a4':'#d6c6a6'}/>
   <Animal kind="fox" pos={[-1.02,.12,.88]}/>
 </group>;
}
function Garden({onSelect,selected,growth}:{onSelect:()=>void;selected:boolean;growth:number}){
 const click=(e:ThreeEvent<MouseEvent>)=>{e.stopPropagation();onSelect();};
 return <group position={STATION_POSITION.garden} onClick={click}>
  <mesh position={[0,.02,0]} castShadow><cylinderGeometry args={[1.3,1.34,.19,12]}/><Matte color="#d9b99a"/></mesh>
  <mesh position={[0,.16,0]}><cylinderGeometry args={[1.14,1.18,.12,12]}/><Matte color="#7baf88"/></mesh>
  {Array.from({length:Math.min(12,4+growth)},(_,i)=>{const a=i*Math.PI*2/12;return <Flower key={i} pink={i%2===0} pos={[Math.cos(a)*.84,.23,Math.sin(a)*.8]}/>;})}
  <Tree pos={[-.62,.21,-.47]} size={1.1} blossom/>
  <Animal kind="bunny" pos={[.45,.3,.43]}/>
  <Sphere pos={[0,.21,0]} scale={[selected?.34:.25,.14,selected?.34:.25]} color="#f9e6a6"/>
 </group>;
}
function Speaking({onSelect,selected}:{onSelect:()=>void;selected:boolean}){
 const click=(e:ThreeEvent<MouseEvent>)=>{e.stopPropagation();onSelect();};
 return <group position={STATION_POSITION.speak} onClick={click}>
   <mesh position={[0,-.02,0]} receiveShadow><cylinderGeometry args={[1.36,1.5,.24,14]}/><Matte color="#d8c3a1"/></mesh>
   <mesh position={[0,.14,0]} receiveShadow><cylinderGeometry args={[1.14,1.2,.12,14]}/><Matte color={selected?'#9ebbc7':'#80a9ad'}/></mesh>
   <Cylinder pos={[.23,.44,-.27]} scale={[.07,.8,.07]} color="#c8ae85"/>
   <Sphere pos={[.23,.95,-.27]} scale={[.17,.18,.16]} color="#f7e4bc"/>
   <Animal kind="owl" pos={[-.18,.31,.23]}/>
   {[-.85,.8].map(x=><Cylinder key={x} pos={[x,.31,.32]} scale={[.07,.65,.07]} color="#ecd6ad"/>)}
 </group>;
}
function Bridge({onSelect,selected}:{onSelect:()=>void;selected:boolean}){
 const click=(e:ThreeEvent<MouseEvent>)=>{e.stopPropagation();onSelect();};
 return <group position={STATION_POSITION.debate} onClick={click}>
   <mesh position={[0,.18,0]} castShadow><boxGeometry args={[2.8,.25,1.08]}/><Matte color={selected?'#d9b0c4':'#c8a6ba'}/></mesh>
   {[-1.25,1.25].map(x=><group key={x}>
    <Cylinder pos={[x,.38,-.48]} scale={[.08,.6,.08]} color="#9f7f9d"/>
    <Cylinder pos={[x,.38,.48]} scale={[.08,.6,.08]} color="#9f7f9d"/>
   </group>)}
   <Cylinder pos={[0,.53,-.48]} scale={[1.45,.09,.07]} color="#9f7f9d" />
   <Cylinder pos={[0,.53,.48]} scale={[1.45,.09,.07]} color="#9f7f9d" />
   <Sphere pos={[-.92,.14,.05]} scale={[.22,.1,.24]} color="#f4e5cd"/>
   <Sphere pos={[.95,.14,.02]} scale={[.22,.1,.24]} color="#f4e5cd"/>
 </group>;
}
function Island({selected,onSelect,reduced,growth}:{selected:Station|null;onSelect:(station:Station)=>void;reduced:boolean;growth:number}){
 const butterflies=useRef<Group>(null);
 useFrame(({clock})=>{if(!butterflies.current||reduced)return;butterflies.current.rotation.y=clock.getElapsedTime()*.12;butterflies.current.position.y=Math.sin(clock.getElapsedTime()*1.2)*.16;});
 const trees=useMemo<Point[]>(()=>[[-4.95,.1,-.8],[-3.8,.1,-2.55],[-2.1,.1,-2.55],[.08,.1,-2.55],[1.2,.1,-2.38],[4.68,.1,-1.45],[4.8,.1,.88],[-4.7,.1,2.32],[.25,.1,2.65],[3.1,.1,2.65]],[]);
 return <group>
   <Sphere pos={[0,-.6,0]} scale={[5.7,.65,3.55]} color="#b8c6ba"/>
   <Sphere pos={[0,-.33,0]} scale={[5.83,.58,3.67]} color="#91af86"/>
   <Sphere pos={[0,-.09,0]} scale={[5.65,.35,3.5]} color="#a8c899"/>
   <Sphere pos={[1.1,-.06,2.45]} scale={[1.2,.02,.63]} color="#a5d9dc"/>
   {trees.map((p,i)=><Tree key={i} pos={p} size={i%3===0?.85:1.05} blossom={i===2||i===7}/>)}
   {Array.from({length:22},(_,i)=>{const a=i*2.399;const r=1.3+(i%4)*1.02;return <Flower key={i} pos={[Math.cos(a)*r,.09,Math.sin(a)*r*.65]} pink={i%3===0}/>;})}
   {Array.from({length:9},(_,i)=><Sphere key={i} pos={[-3.5+i*.8,.05,.15+Math.sin(i*.8)*.14]} scale={[.24,.045,.17]} color="#e6d5ad"/>)}
   <Garden onSelect={()=>onSelect('garden')} selected={selected==='garden'} growth={growth}/>
   <Cottage onSelect={()=>onSelect('story')} selected={selected==='story'}/>
   <Speaking onSelect={()=>onSelect('speak')} selected={selected==='speak'}/>
   <Bridge onSelect={()=>onSelect('debate')} selected={selected==='debate'}/>
   <group ref={butterflies} position={[1.6,1.9,0]}>
      <Sphere pos={[1.3,0,.4]} scale={[.09,.07,.055]} color="#d7a5bd"/><Sphere pos={[1.16,.04,.4]} scale={[.08,.13,.025]} color="#ead6eb"/>
      <Sphere pos={[-1.2,.16,-.3]} scale={[.075,.07,.07]} color="#e6cf83"/><Sphere pos={[-1.31,.2,-.3]} scale={[.085,.13,.03]} color="#f5e9ac"/>
   </group>
 </group>;
}
function CameraRig({station,reduced}:{station:Station|null;reduced:boolean}){
 const {camera,size}=useThree();
 const target=useRef(new THREE.Vector3(0,0,0));
 useFrame((_,delta)=>{
  const position=station?STATION_POSITION[station]:[0,0,0] as Point;
  const distance=size.width<550?.89:size.width<900?.79:.83;
  const desired=new THREE.Vector3(position[0]*.35+8.4*distance,position[1]*.2+8.7*distance,position[2]*.25+12.4*distance);
  const look=new THREE.Vector3(position[0]*.35,.15,position[2]*.27);
  const speed=reduced?1:1-Math.exp(-delta*3.9);
  camera.position.lerp(desired,speed);target.current.lerp(look,speed);camera.lookAt(target.current);
  if(camera instanceof THREE.PerspectiveCamera){const fov=size.width<540?48:size.width<900?43:37;if(Math.abs(camera.fov-fov)>.15){camera.fov=fov;camera.updateProjectionMatrix();}}
 });
 return null;
}
function WorldScene({station,onSelect,reduced,growth}:{station:Station|null;onSelect:(s:Station)=>void;reduced:boolean;growth:number}){
 return <>
 <fog attach="fog" args={['#dceadf',17,33]}/>
 <hemisphereLight args={['#fff4e2','#779995',1.5]}/>
 <ambientLight intensity={.2}/>
 <directionalLight position={[4,11,7]} intensity={1.85} color="#fff4d1" castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} shadow-camera-near={.5} shadow-camera-far={36} shadow-camera-left={-9} shadow-camera-right={9} shadow-camera-top={9} shadow-camera-bottom={-9}/>
 <CameraRig station={station} reduced={reduced}/>
 <Island selected={station} onSelect={onSelect} reduced={reduced} growth={growth}/>
 </>;
}
function Fallback({onSelect}:{onSelect:(s:Station)=>void}){return <div className="world-fallback" role="group" aria-label="SpeakLab village stations">
 <div className="world-fallback-scene"><span className="sun-disc"/><div className="fallback-hill hill-far"/><div className="fallback-hill hill-near"/><span className="fallback-cottage">⌂</span></div>
 <div className="world-fallback-buttons">{(Object.keys(stationMeta) as Station[]).map(id=><button key={id} onClick={()=>onSelect(id)}>{stationMeta[id].emoji} {stationMeta[id].label}</button>)}</div>
 </div>}
function WorldStage({station,onSelect,reduced,active,growth}:Props){
 const [supported,setSupported]=useState<boolean|null>(null);
 useEffect(()=>{try{const canvas=document.createElement('canvas');setSupported(!!(canvas.getContext('webgl2')||canvas.getContext('webgl')))}catch{setSupported(false)}},[]);
 return <section className="world-stage" aria-label="Interactive three-dimensional learning village">
  <div className="world-sky"><span className="world-cloud cloud-one"/><span className="world-cloud cloud-two"/><span className="world-sun"/></div>
  {supported?<Canvas dpr={[1,Math.min(window.devicePixelRatio,1.6)]} shadows="basic" gl={{antialias:true,alpha:true,powerPreference:'high-performance'}} camera={{position:[8.4,8.7,12.4],fov:37,near:.1,far:60}} frameloop={active&&!reduced?'always':'demand'} onCreated={({gl})=>gl.setClearColor('#f1eee0',0)}>
    <WorldScene station={station} onSelect={onSelect} reduced={reduced} growth={growth}/>
   </Canvas>:<Fallback onSelect={onSelect}/>}
  <div className="world-attribution"><span className="live-dot"/> {supported?'Living 3D village':'Storybook village'}</div>
  <div className="world-location-labels" aria-label="Village landmarks">
    {(Object.keys(stationMeta) as Station[]).map((id)=> <button type="button" className={station===id?'world-tag is-current':'world-tag'} key={id} onClick={()=>onSelect(id)} aria-pressed={station===id}>
       <span>{stationMeta[id].emoji}</span>{stationMeta[id].label}
    </button>)}
  </div>
 </section>;
}
export default memo(WorldStage);
