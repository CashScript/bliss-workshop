import { Contract, ElectrumNetworkProvider, SignatureTemplate } from 'cashscript';
import artifact from './nft-marketplace.json' assert { type: "json" };

// Define the seller
const sellerPrivateKeyWif = 'cQQPLCFSejnpcQR8nY7yeUcdJeQuAYqqZCap17q1v8aD2itXFWr8';
const sellerPublicKey = '033b4cc125f6190888b0f1d1b68f0601d606ae62668578c43f58c184e01bc4afe7';
const sellerTokenAddress = 'bchtest:zzdj66t6jmwaftl3mw99f9yd4h69a9lt8s9qj7qcnq';

// Define the buyer
const buyerPrivateKeyWif = 'cV6w5hLNb2U9qUp6cYhEGgrZNyt4W47dnaMPFcxQuLweo6rVMifD';
const buyerPublicKey = '02c4fa839e6f5c4981fe85589ea4b19d5d8e95c13a3d433f462a41efee40e9f692';
const buyerTokenAddress = 'bchtest:zpr9eqzn7ytdfel626f7rqhls6c33rc8hqhxkwlc4z';

// Set the NFT price
const price = 10000n;

// Instantiate the contract on chipnet
const provider = new ElectrumNetworkProvider('chipnet');
const contract = new Contract(artifact, [sellerPublicKey, price], { provider });

console.log('Contract address:', contract.tokenAddress);

// Get contract UTXOs and ensure there is an NFT UTXO
const utxos = await contract.getUtxos();
const nftUtxo = utxos.find(utxo => utxo.token?.nft);

console.log('NFT UTXO:', nftUtxo);

if (!nftUtxo) {
  console.error('No NFT UTXO found, send to contract address first.');
  process.exit(1);
}

// Get buyer UTXOs and ensure there is a payment UTXO
const buyerUtxos = await provider.getUtxos(buyerTokenAddress);
const buyerPaymentUtxo = buyerUtxos.find(utxo => utxo.satoshis >= 11000n && !utxo.token);

console.log('Buyer payment UTXO:', buyerPaymentUtxo);

if (!buyerPaymentUtxo) {
  console.error('No buyer payment UTXO found, fund wallet first.');
  process.exit(1);
}

const transactionHash = await contract.functions.buy()
  // Add the NFT to the transaction
  .from(nftUtxo)
  // Add the payment to the transaction
  .fromP2PKH(buyerPaymentUtxo, new SignatureTemplate(buyerPrivateKeyWif))
  // Send the payment to the seller
  .to(sellerTokenAddress, 10000n)
  // Send the NFT to the buyer
  .to(buyerTokenAddress, 1000n, nftUtxo.token)
  .send();

console.log(transactionHash);
