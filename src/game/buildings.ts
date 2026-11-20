export type BuildingId='flower-bed'|'story-bench'|'picnic-table'|'lantern-arch';
export type BuildingItem={id:BuildingId;name:string;cost:number;description:string;icon:string};
export const BUILD_ITEMS:readonly BuildingItem[]=[
 {id:'flower-bed',name:'Wildflower Garden',cost:2,description:'A growing patch of handmade blossoms.',icon:'✿'},
 {id:'story-bench',name:'Storytime Bench',cost:3,description:'A cozy wooden seat for planning stories.',icon:'⌂'},
 {id:'picnic-table',name:'Conversation Picnic',cost:4,description:'A meeting place for your woodland friends.',icon:'◇'},
 {id:'lantern-arch',name:'Moonlight Arch',cost:5,description:'A luminous landmark for your home meadow.',icon:'✦'}
];
export const BUILD_COST=new Map(BUILD_ITEMS.map(item=>[item.id,item.cost]));
export function spentAcorns(owned:Record<string,string[]>):number{
 return Object.values(owned).flat().reduce((total,id)=>total+(BUILD_COST.get(id as BuildingId)||0),0);
}
