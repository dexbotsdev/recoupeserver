import axios from "axios";
import Web3 from "web3";

const getOptions=(abi: any, address: any)=> {
    const web3 = new Web3('https://eth-mainnet.g.alchemy.com/v2/aFasnkRy_YJNvT2uo3lLnqVsu1jt3Jnu');
    return  new web3.eth.Contract(abi, address).options
  }

  
const getContractABI = async (address: any)=>{ 

    let functionsList:any[]=[];
    console.log(address)

    console.log('-------------------------------------')

    const abi  = await axios.get(`https://api.etherscan.io/api?module=contract&action=getabi&address=${address}&apikey=UHC6JGAPVA9FJIG7X9PFTZAX94JVFIE285`)
    .then(res=>res)
    .catch(err=>null);

     if(abi?.data){
        const opt =getOptions(JSON.parse(abi.data.result), address);

        opt.jsonInterface.forEach(element => {

             if(element.type =='function'){
                functionsList.push(element);
             }
            
          });
     }

     return functionsList;
  }


  export default getContractABI;