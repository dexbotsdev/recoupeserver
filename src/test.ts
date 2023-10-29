import getContractABI from "./services/EtherscanService";



const data = await getContractABI('0x7a63d17f5a59bca04b6702f461b1f1a1c59b100b');


console.log(data)