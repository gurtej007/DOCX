const { WebSocketServer } = require('ws');
const { PrismaClient } = require('../generated/prisma');
const { Transform } = require('./utils/transform.js'); 
const prisma = new PrismaClient();
const documentClients = new Map();  
const documentState = new Map();

async function handleMessage(socket, data){

    console.log(data);
    const {type,payload}=JSON.parse(data);
    console.log(socket);
    switch(type){
        case 'join':
            await handleJoin(socket,payload);
            break;
        case 'insert':
            handleinsert(socket,payload);
            break;
        case 'delete':
            handleDelete(socket,payload);
            break;
    }

}  
async function handleJoin(socket,payload){{
    const {docId}=payload;
    if(!documentClients.has(docId)){
        documentClients.set(docId, new Set());
    }
    documentClients.get(docId).add(socket);
    const doc=await prisma.doc.findUnique({
        where:{id:docId}
    })
    if(!doc){
        socket.send(JSON.stringify({type:'error',message:'Document not found'}));
        return;
    }
    socket.doc=doc;
    console.log(`User joined: ${docId}`);
    if(!documentState.has(docId)){
        documentState.set(docId,{
            content:doc.content||'',
            version:0,
            ops:[]
        });
        
    }
    

    socket.send(JSON.stringify({type:'join',success:true}));
}
}
async function handleinsert(socket,payload){
    const {docId,pos,text,len,baseVersion}=payload;
    const currentState=documentState.get(docId);
    const currentVersion=currentState.version;
    const currentContent=currentState.content;
    console.log(currentContent);
    transform=new Transform(currentState,'insert',pos,baseVersion,text);
    const newContent=transform.transform();
    documentState.set(docId,{
        content:newContent,
        version:currentVersion+1,
        ops:[...currentState.ops, {type:'insert',pos,text}]
    });
    console.log(currentVersion+1);

    broadcast(docId,socket, {type:'insert',payload:{pos,text}});
}

async function handleDelete(socket,payload){
    const {docId,pos,len,text,baseVersion}=payload;
    const currentState=documentState.get(docId);
    const currentVersion=currentState.version;
    const currentContent=currentState.content;
    console.log('currentContent:', currentContent);
    transform=new Transform(currentState,'delete',pos,baseVersion,'',len);
    const newContent=transform.transform();
    console.log(newContent);
    documentState.set(docId,{
        content:newContent,
        version:currentVersion+1,
        ops:[...currentState.ops, {type:'delete',pos,len}]
    });

    broadcast(docId,socket, {type:'delete',payload:{pos,len}});
}


function broadcast(docId, senderSocket, message) {
    const clients = documentClients.get(docId) || new Set();
    clients.forEach(client => {
      if (client !== senderSocket && client.readyState === 1) {
        client.send(JSON.stringify(message));
      }
    });
  }
module.exports = handleMessage;






