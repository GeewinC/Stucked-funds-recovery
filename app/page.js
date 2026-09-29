'use client';
import { useState } from 'react';
import { ethers } from 'ethers';
import { CrossChainMessenger } from '@eth-optimism/sdk';

export default function Page() {
  const [addr, setAddr] = useState('');
  const [txHash, setTxHash] = useState('0xb93b883f36786cf5fa71f3a3f96c83ca89331ebf5d0835af534f5533e11a4d8b');
  const [log, setLog] = useState('Ready - SDK bundled inside, Airtel cannot block ✅');
  const [status, setStatus] = useState('');

  let signerRef = null;

  const connect = async () => {
    const p = new ethers.BrowserProvider(window.ethereum);
    await p.send("eth_requestAccounts", []);
    const signer = await p.getSigner();
    signerRef = signer;
    setAddr(await signer.getAddress());
    try { await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x1' }] }); } catch(e){}
    setLog('Connected: ' + await signer.getAddress());
    return signer;
  };

  const getMessenger = async (l1Signer) => {
    let s = l1Signer;
    if (!s) {
      if (signerRef) s = signerRef;
      else {
        s = await connect();
      }
    }
    return new CrossChainMessenger({
      l1ChainId: 1,
      l2ChainId: 7777777,
      l1SignerOrProvider: s,
      l2SignerOrProvider: new ethers.JsonRpcProvider("https://rpc.zora.energy"),
      bedrock: true,
    });
  };

  const check = async () => {
    setLog('Checking Zora RPC...');
    try {
      const zp = new ethers.JsonRpcProvider("https://rpc.zora.energy");
      const rcpt = await zp.getTransactionReceipt(txHash);
      if (!rcpt) { setLog('Tx not found on Zora'); return; }
      const l1p = new ethers.JsonRpcProvider("https://eth.llamarpc.com");
      const m = new CrossChainMessenger({ l1ChainId:1, l2ChainId:7777777, l1SignerOrProvider:l1p, l2SignerOrProvider:zp, bedrock:true });
      const st = await m.getMessageStatus(txHash);
      const map = {0:'Unconfirmed',1:'Ready to Prove',2:'Waiting 7 days',3:'Ready to Finalize',4:'Done'};
      setStatus(`Status ${st}: ${map[st] || st} - Block ${rcpt.blockNumber}`);
      setLog(`Found ✅ Block ${rcpt.blockNumber} - ${map[st]}`);
    } catch(e){ setLog('Error: '+e.message); }
  };

  const prove = async () => {
    setLog('Proving... confirm on Mainnet');
    try {
      const m = await getMessenger();
      const tx = await m.proveMessage(txHash);
      setLog(`Prove sent: ${tx.hash} waiting...`);
      await tx.wait();
      setLog(`✅ Proven! ${tx.hash} - Wait 7 days then Finalize`);
    } catch(e){ setLog('Error: '+e.message); }
  };

  const finalize = async () => {
    setLog('Finalizing... confirm on Mainnet');
    try {
      const m = await getMessenger();
      const tx = await m.finalizeMessage(txHash);
      setLog(`Finalize sent: ${tx.hash} waiting...`);
      await tx.wait();
      setLog(`✅ Finalized! ETH back on L1 - ${tx.hash}`);
    } catch(e){ setLog('Error: '+e.message); }
  };

  return (
    <div style={{maxWidth:600,margin:'0 auto',padding:20}}>
      <h2>Zora Recovery - Next.js Bundled</h2>
      <div style={{fontSize:12,color:'#888',wordBreak:'break-all',marginBottom:12}}>{log}</div>
      
      <div style={{background:'#1e1e1e',borderRadius:16,padding:18,marginTop:14}}>
        <button onClick={connect} style={{width:'100%',padding:14,borderRadius:12,border:0,fontWeight:700}}>Connect Wallet (Mainnet)</button>
        <div style={{fontSize:12,color:'#888',marginTop:8,wordBreak:'break-all'}}>{addr}</div>
      </div>

      <div style={{background:'#1e1e1e',borderRadius:16,padding:18,marginTop:14}}>
        <input value={txHash} onChange={e=>setTxHash(e.target.value)} style={{width:'100%',padding:12,borderRadius:10,border:'1px solid #333',background:'#111',color:'white',boxSizing:'border-box'}} />
        <button onClick={check} style={{width:'100%',padding:14,borderRadius:12,border:0,fontWeight:700,marginTop:10,background:'#4F6EF7',color:'white'}}>Check Status</button>
        <div style={{fontSize:13,marginTop:10}}>{status}</div>
      </div>

      <div style={{background:'#1e1e1e',borderRadius:16,padding:18,marginTop:14}}>
        <button onClick={prove} style={{width:'100%',padding:14,borderRadius:12,border:0,fontWeight:700,background:'#4F6EF7',color:'white'}}>1. Prove Withdrawal</button>
        <button onClick={finalize} style={{width:'100%',padding:14,borderRadius:12,border:0,fontWeight:700,marginTop:10,background:'white',color:'black'}}>2. Finalize after 7 days</button>
      </div>

      <div style={{fontSize:11,color:'#666',marginTop:20}}>
        Safe - No private key. Uses official portal 0x1a0ad011913A150f69f6A19DF447A0CfD9551054. SDK is bundled at build time, so Airtel cannot block.
      </div>
    </div>
  );
}
