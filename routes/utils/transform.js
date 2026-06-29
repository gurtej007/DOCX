

class Transform {

    constructor(currentState,type,pos,baseVersion,text='',len=0){
        this.currentState = currentState;
        this.type = type;
        this.pos = pos;
        this.text = text;
        this.baseVersion=baseVersion;
        this.version=currentState.version;
        this.ops=currentState.ops;
        this.content=currentState.content;
        this.deleteLen=len;
    }

    transform(){
        let idx=this.pos;
        const docBaseVersion = this.currentState.baseVersion || 0;  // Where ops array starts
        
        switch(this.type){
            case 'insert':
                for(let i=this.baseVersion;i<this.version;i++){
                    const op=this.ops[i-docBaseVersion];  // Use document's baseVersion
                    if(!op) continue;  // Skip if op doesn't exist
                    if(op.type==='insert'){
                        let len=op.text.length;
                        let pos=op.pos;
                        if(pos<=idx){
                            idx+=len;
                        }
                    }
                    else if(op.type==='delete'){
                        let len=op.len;
                        let pos=op.pos;
                        if(pos<=idx){
                            idx-=len;
                            if(idx<0){
                                idx=0;
                            }
                            console.log(`Adjusted idx by -${len} to ${idx}`);
                        }
                    }
                }
                const newContent=this.content.slice(0,idx)+this.text+this.content.slice(idx);
                console.log('Final idx:', idx, 'Text:', this.text); 
                return {newContent,idx};
            case 'delete':
                let deleteLen=this.deleteLen;
                for(let i=this.baseVersion;i<this.version;i++){
                    const op=this.ops[i-docBaseVersion];  // Use document's baseVersion
                    if(!op) continue;  // Skip if op doesn't exist
                    if(op.type==='insert'){
                        let len=op.text.length;
                        let pos=op.pos;
                        if(pos<=idx){
                            idx+=len;
                        }
                    }
                    else if(op.type==='delete'){
                        let ps=op.pos;
                        let pe=op.pos+op.len-1;
                        let cs=idx;
                        let ce=idx+deleteLen-1;
                        if(cs>pe){
                            idx-=op.len;
                        }
                        else if(ce<ps)
                            continue;
                        else {
                            let overlap=Math.min(pe,ce)-Math.max(ps,cs)+1;
                            deleteLen-=overlap;
                            if(deleteLen<=0){
                                break;
                            }
                            idx=Math.min(ps,cs);
                        }
                    }
                }
                const updatedContent=this.content.slice(0,idx)+this.content.slice(idx+deleteLen);
                console.log(updatedContent);
                return {newContent: updatedContent, idx};
                
        }
    }    
}

module.exports = {Transform}


