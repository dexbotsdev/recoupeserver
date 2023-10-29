import { ethers } from "ethers";
import getContractABI from "./EtherscanService";


 
const getContractMethodSignatures =async (address:string) => {

    try{
        const methods = await getContractABI(address); 
        
        return methods; 
    }catch(error){
        console.log(error);
        return null;
    }
   
}


export default getContractMethodSignatures;
