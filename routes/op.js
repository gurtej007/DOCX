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
            if(socket.role=='VIEWER'){
                socket.send(JSON.stringify({type:'error',message:'You dont have edit access to this document'}));
                return;
            }
            handleinsert(socket,payload);
            break;
        case 'delete':
            if(socket.role=='VIEWER'){
                socket.send(JSON.stringify({type:'error',message:'You dont have edit access to this document'}));
                return;
            }
            handleDelete(socket,payload);   
            break;
    }

}  
async function handleJoin(socket,payload){
    const {docId,userEmail}=payload;
    if(!documentState.has(docId)){
        const doc=await prisma.doc.findUnique({
            where:{id:docId}
        })
        if(!doc){
            socket.send(JSON.stringify({type:'error',message:'Document not found'}));
            return;
        }
        documentState.set(docId, {
            title: doc.title || 'Untitled Document',
            content: doc.content || '',
            version: doc.version || 0,
            baseVersion: doc.version || 0,  // Track where ops start
            ops: []
        });
    }
    if(!documentClients.has(docId)){
        documentClients.set(docId, new Set());
    }
    const user=await prisma.user.findUnique({
        where:{email:userEmail}
    })
    if(!user){
        socket.send(JSON.stringify({type:'error',message:'User not found'}));
        return;
    }
    const access=await prisma.docAccess.findFirst({
        where:{
            docId:docId,
            userId:user.id
        }
    })
    if(!access){
        socket.send(JSON.stringify({type:'error',message:'You are not allowed to join this document'}));
        return;
    }

    documentClients.get(docId).add(socket);

    socket.docId=docId;
    socket.userEmail=userEmail;
    socket.role=access.role;
    console.log(`User joined: ${docId} ${userEmail}`);

    const onlineUsers = Array.from(documentClients.get(docId)).map(s => s.userEmail);
    broadcastAll(docId,socket,{type:'join',success:true,payload:{useronline:onlineUsers}});
    const state = documentState.get(docId);
    socket.send(JSON.stringify({
        type:'init',
        title: state.title,
        content: state.content,
        version: state.version,
        role:socket.role
    }));
}


// Clean up on disconnect
function handleDisconnect(socket) {
    const docId = socket.docId;
    const userEmail = socket.userEmail;
    
    
    console.log(`Socket disconnected: ${docId} ${userEmail}`);
    if(documentClients.get(docId)){
        documentClients.get(docId).delete(socket);
    }
        
    // Broadcast updated user list to remaining clients
    if(documentClients.get(docId)){
        const onlineUsers = Array.from(documentClients.get(docId)).map(s => s.userEmail);
        broadcast(docId, socket, {type:'leave', success:true, payload:{useronline:onlineUsers}});
    }
}

async function handleinsert(socket,payload){
    const {docId,pos,text,len,baseVersion}=payload;
    const currentState=documentState.get(docId);
    const currentVersion=currentState.version;
    const currentContent=currentState.content;
    console.log(currentContent);
    const transform=new Transform(currentState,'insert',pos,baseVersion,text);
    const {newContent,idx}=transform.transform();
    documentState.set(docId,{
        content:newContent,
        version:currentVersion+1,
        baseVersion: currentState.baseVersion || 0,  // Preserve baseVersion
        ops:[...currentState.ops, {type:'insert',pos:idx,text}]
    });
    broadcast(docId,socket, {type:'insert',payload:{pos:idx,text,version:currentVersion+1}});
}

async function handleDelete(socket,payload){
    const {docId,pos,len,text,baseVersion}=payload;
    const currentState=documentState.get(docId);
    const currentVersion=currentState.version;
    const currentContent=currentState.content;
    console.log('currentContent:', currentContent);
    const transform=new Transform(currentState,'delete',pos,baseVersion,'',len);
    const {newContent,idx}=transform.transform(); 
    console.log(newContent);
    documentState.set(docId,{
        content:newContent,
        version:currentVersion+1,
        baseVersion: currentState.baseVersion,  // Preserve baseVersion
        ops:[...currentState.ops, {type:'delete',pos:idx,len}]
    });

    broadcast(docId,socket, {type:'delete',payload:{pos:idx,len,version:currentVersion+1}});
}

async function handleSave(docId){
    const currentState=documentState.get(docId);
    await prisma.doc.update({
        where:{id:docId},
        data:{content:currentState.content,version:currentState.version}
    });
}
setInterval(async ()=>{
    for(const docId of documentState.keys()){
        await handleSave(docId);
    }
},10000);

function broadcast(docId, senderSocket, message) {
    const clients = documentClients.get(docId) || new Set();
    clients.forEach(client => {
      if (client !== senderSocket && client.readyState === 1) {
        client.send(JSON.stringify(message));
      }
    });
}
function broadcastAll(docId, senderSocket, message) {
    const clients = documentClients.get(docId) || new Set();
    clients.forEach(client => {
      if (client.readyState === 1) {
        client.send(JSON.stringify(message));
      }
    });
}
module.exports = handleMessage;
module.exports.handleDisconnect = handleDisconnect;
module.exports.documentState = documentState;
module.exports.broadcastAll = broadcastAll;






