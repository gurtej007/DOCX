const express = require('express');
const router = express.Router();
const { PrismaClient, Role } = require('../generated/prisma');
const { documentState, broadcastAll } = require('./op.js');

const prisma = new PrismaClient();

router.post('/create', async (req,res)=>{
    const {title, content, ownerEmail}=req.body;  // Frontend sends email
    console.log(title, content, ownerEmail);
    
    try{
        // Step 1: Find user by email and get their UUID
        const owner = await prisma.user.findUnique({
            where: { email: ownerEmail }
        });
        
        if (!owner) {
            return res.status(400).json({
                success: false, 
                error: 'Owner not found. Please provide a valid email address.'
            });
        }
        
        // Step 2: Create document using the UUID (owner.id)
        const doc=await prisma.doc.create({
            data:{
                title,
                content
            }
        })
        await prisma.docAccess.create({
            data:{
                role:Role.OWNER,
                docId:doc.id,
                userId:owner.id
            }
        })
        
        res.status(200).json({success:true,doc})
    }catch(error){
        res.status(500).json({success:false,error:error.message})
    }
})
router.get('/', async (req,res)=>{
    try{
        const {userEmail}=req.query;  // Changed from req.body to req.query
        const user=await prisma.user.findUnique({
            where:{email:userEmail}
        })
        if(!user){
            return res.status(404).json({success:false,error:'User not found'})
        }
        const docAccess=await prisma.docAccess.findMany({
            where:{userId:user.id},
            include:{
                doc:true  // Include the full document details
            }
        })
        // Transform to return docs with role information
        const docs = docAccess.map(access => ({
            ...access.doc,
            role: access.role
        }))
        res.status(200).json({success:true,docs})
    }catch(error){
        res.status(500).json({success:false,error:error.message})
    }
})
router.get('/:id', async (req,res)=>{
    const {id}=req.params;
    try{
        const doc=await prisma.doc.findUnique({
            where:{id}
        })
        if(!doc){
            return res.status(404).json({success:false,message:'Document not found'})
        }
        res.status(200).json({success:true,doc})
    }catch(error){
        res.status(500).json({success:false,error:error.message})
    }
})

router.delete('/delete/:id', async (req,res)=>{
    const {id}=req.params;
    try{
        const doc=await prisma.doc.delete({
            where:{id}
        })
        res.status(200).json({success:true,doc})
    }
    catch(error){
        res.status(500).json({success:false,error:error.message})
    }
})
router.put('/update/:id', async (req,res)=>{
    const {id}=req.params;
    const {title}=req.body;
    try{
        const doc=await prisma.doc.update({
            where:{id},
            data:{title}
        })
        
        // Update documentState if doc is currently open
        if(documentState.has(id)){
            const state = documentState.get(id);
            documentState.set(id, {
                ...state,
                title: title
            });
            
            // Broadcast title change to all connected users
            broadcastAll(id, null, {
                type: 'titleUpdate',
                title: title
            });
        }
        
        res.status(200).json({success:true,doc})
    }
    catch(error){
        res.status(500).json({success:false,error:error.message})
    }
})

router.post('/share', async (req,res)=>{
    const {docId, email, role}=req.body;
    try{
        const doc=await prisma.doc.findUnique({
            where:{id:docId}
        })
        if(!doc){
            return res.status(404).json({success:false,message:'Document not found'})
        }
        const user=await prisma.user.findUnique({
            where:{email}
        })
        if(!user){
            return res.status(404).json({success:false,message:'User not found'})
        }
        const docAccess=await prisma.docAccess.create({
            data:{
                role,
                docId,
                userId:user.id
            }
        })
        res.status(200).json({success:true,docAccess})
    }
    catch(error){
        res.status(500).json({success:false,error:error.message})
    }
})
module.exports = router;