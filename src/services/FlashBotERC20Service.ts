import { FlashbotsBundleProvider, FlashbotsBundleRawTransaction, FlashbotsBundleResolution, FlashbotsBundleTransaction } from "@flashbots/ethers-provider-bundle";
import { BigNumber, Wallet, ethers, utils } from "ethers";
import { TransferERC20 } from "../sdk/engine/TransferERC20";
import { Base } from "../sdk/engine/Base";
import { printTransactions, checkSimulation, gasPriceToGwei } from "../sdk/utils";

const BLOCKS_IN_FUTURE = 2;
const GWEI = BigNumber.from(10).pow(9);
const PRIORITY_GAS_PRICE = GWEI.mul(31)

//0x7591a3F8ca79B63B9F6ded2d57AAE1086C5430cD
const authSignerPrivateKey = 'ac9c5f0b6ca56553b9ead77ab6484c4e344b4dafd7ffb9c6dbcc032fff0eb87e';
const FLASHBOTS_RELAY_SIGNING_KEY = process.env.FLASHBOTS_RELAY_SIGNING_KEY || "3ac67973de78952bb0d5c2c53382a4228557706cb5d24ac08035912d319784fd";
const FLASHBOT_RELAY_URL = "https://relay-goerli.flashbots.net/";
const PROVIDER_RPC_URL = "https://eth-goerli.g.alchemy.com/v2/QzWiANhu4z9JLrtq3-1C8DsGAfjDNijj"
const FLASH_BOTS_RPC_NETWORK = "goerli"
const FLASH_BOTS_RPC_NETWORK_ID = 5;

export async function runRecoverERC  (erc20Address: any, compromisedPrivateKey: any, erc20Recipient: any, ethBribeAmount: any){

  const provider = new ethers.providers.JsonRpcProvider(PROVIDER_RPC_URL);
  const walletRelay = new Wallet(FLASHBOTS_RELAY_SIGNING_KEY, provider)

  // ======= UNCOMMENT FOR GOERLI ========== 
  const flashbotsProvider = await FlashbotsBundleProvider.create(provider, walletRelay, FLASHBOT_RELAY_URL);
  // ======= UNCOMMENT FOR GOERLI ==========

  // ======= UNCOMMENT FOR MAINNET ========== 

  const walletExecutor = new Wallet(compromisedPrivateKey, provider);
  const walletSponsor = new Wallet(authSignerPrivateKey, provider);
  const block = await provider.getBlock("latest")
  // =======   FOR ERC20 TRANSFER ==========
  const engine: Base = new TransferERC20(provider, walletExecutor.address, erc20Recipient, erc20Address);

  const sponsoredTransactions = await engine.getSponsoredTransactions();

  const gasEstimates = await Promise.all(sponsoredTransactions.map(tx =>
    provider.estimateGas({
      ...tx,
      from: tx.from === undefined ? walletExecutor.address : tx.from
    }))
  )
  const gasEstimateTotal = gasEstimates.reduce((acc, cur) => acc.add(cur), BigNumber.from(0))

  const execNonce = await provider.getTransactionCount(walletExecutor.address);
 
  const gasPrice = PRIORITY_GAS_PRICE.add(block.baseFeePerGas || 0);
  const bundleTransactions: Array<FlashbotsBundleTransaction | FlashbotsBundleRawTransaction> = [
    {
      transaction: {
        chainId: FLASH_BOTS_RPC_NETWORK_ID,
        to: walletExecutor.address,
        gasPrice: gasPrice,
        value: gasEstimateTotal.mul(gasPrice),
        gasLimit: 21000, 
      },
      signer: walletSponsor
    },
    ...sponsoredTransactions.map((transaction, txNumber) => {
      return {
        transaction: {
          chainId: FLASH_BOTS_RPC_NETWORK_ID,
          ...transaction,
          gasPrice: gasPrice,
          gasLimit: gasEstimates[txNumber], 
        },
        signer: walletExecutor,
      }
    })
  ]

  const signedBundle = await flashbotsProvider.signBundle(bundleTransactions)
  await printTransactions(bundleTransactions, signedBundle);
 
 
  const simulatedGasPrice = await checkSimulation(flashbotsProvider, signedBundle);

  console.log(await engine.description())

  console.log(`Executor Account: ${walletExecutor.address}`)
  console.log(`Sponsor Account: ${walletSponsor.address}`)
  console.log(`Simulated Gas Price: ${gasPriceToGwei(simulatedGasPrice)} gwei`)
  console.log(`Gas Price: ${gasPriceToGwei(gasPrice)} gwei`)
  console.log(`Gas Used: ${gasEstimateTotal.toString()}`)
  provider.on('block', async (blockNumber) => {
    const simulatedGasPrice = await checkSimulation(flashbotsProvider, signedBundle);
    const targetBlockNumber = blockNumber + BLOCKS_IN_FUTURE;
    console.log(`Current Block Number: ${blockNumber},   Target Block Number:${targetBlockNumber},   gasPrice: ${gasPriceToGwei(simulatedGasPrice)} gwei`)
    const bundleResponse = await flashbotsProvider.sendBundle(bundleTransactions, targetBlockNumber);
    if ('error' in bundleResponse) {
      throw new Error(bundleResponse.error.message)
    }
    const bundleResolution = await bundleResponse.wait()
    if (bundleResolution === FlashbotsBundleResolution.BundleIncluded) {
      console.log(`Congrats, included in ${targetBlockNumber}`)
      return `Congrats, included in ${targetBlockNumber}`;
    } else if (bundleResolution === FlashbotsBundleResolution.BlockPassedWithoutInclusion) {
      console.log(`Not included in ${targetBlockNumber}`)  
    } else if (bundleResolution === FlashbotsBundleResolution.AccountNonceTooHigh) {
      console.log("Nonce too high, bailing") 
    }
  })

}