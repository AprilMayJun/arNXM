import { ethers } from "hardhat";
import { time } from "@openzeppelin/test-helpers";
import { Contract, Signer, BigNumber } from "ethers";
import { NexusMutual } from "./NexusMutual";

function ether(amount: string) : BigNumber {
  return ethers.utils.parseEther(amount);
}

const EXCHANGE_TOKEN = ether('10000');
const EXCHANGE_ETHER = ether('10');
const AMOUNT = ether('100');
describe('arnxm', function(){
  let arNXMVault : Contract;
  let arNXM : Contract;
  let owner : Signer;
  let user : Signer;
  let ownerAddress : string;
  let userAddress : string;
  let nxm : NexusMutual;
  let wNXM : Contract;

  let protocols : Contract[] = [];

  beforeEach(async function(){
    let signers = await ethers.getSigners();
    owner = signers[0];
    user = signers[1];
    userAddress = await user.getAddress();
    ownerAddress = await owner.getAddress();
    nxm = new NexusMutual(owner);
    // deploy external contracts
    const ERC20Mock = await ethers.getContractFactory('ERC20Mock');
    const ExchangeFactoryMock = await ethers.getContractFactory('ExchangeFactoryMock');
    const ExchangeMock = await ethers.getContractFactory('ExchangeMock');
    const WNXM = await ethers.getContractFactory('wNXM');
    const ARNXM = await ethers.getContractFactory('ArNXMToken');
    const ARNXMVault = await ethers.getContractFactory('arNXMVault');
    const dai = await ERC20Mock.deploy();
    const factory = await ExchangeFactoryMock.deploy();
    const exchange = await ExchangeMock.deploy(dai.address, factory.address);

    // initialize external contracts
    await dai.connect(owner).mint(ownerAddress, ether('10000000'));
    await factory.setFactory(dai.address, exchange.address);
    await dai.transfer(exchange.address, EXCHANGE_TOKEN);
    await exchange.recieveEther({ value: EXCHANGE_ETHER });
    await nxm.deploy(dai, factory);

    const protocol_0 = await ERC20Mock.deploy();
    const protocol_1 = await ERC20Mock.deploy();
    const protocol_2 = await ERC20Mock.deploy();
    const protocol_3 = await ERC20Mock.deploy();
    protocols.push(protocol_0);
    protocols.push(protocol_1);
    protocols.push(protocol_2);
    protocols.push(protocol_3);

    const protocolsAddress = protocols.map(x=>x.address);
    
    wNXM = await WNXM.deploy(nxm.nxm.address);
    arNXM = await ARNXM.deploy();
    arNXMVault = await ARNXMVault.deploy(protocolsAddress, wNXM.address, arNXM.address, nxm.master.address);
    await nxm.registerUser(userAddress);
    await nxm.registerUser(wNXM.address);
    await nxm.registerUser(arNXMVault.address);
    await nxm.nxm.connect(owner).transfer(userAddress, AMOUNT); 
    await nxm.nxm.connect(user).approve(wNXM.address, AMOUNT); 
  });

  describe('#deposit', function(){
    beforeEach(async function(){
      await wNXM.connect(user).wrap(AMOUNT);
      await arNXM.connect(owner).mint(ownerAddress, AMOUNT);
    });

    it('should be able to deposit wnxm', async function(){
      await wNXM.connect(user).approve(arNXMVault.address, AMOUNT);
      await arNXMVault.connect(user).deposit(AMOUNT);
    });
  });

  describe('#restake', function(){
    beforeEach(async function(){
      await wNXM.connect(user).wrap(AMOUNT);
      await arNXM.connect(owner).mint(ownerAddress, AMOUNT);
      await wNXM.connect(user).approve(arNXMVault.address, AMOUNT);
      await arNXMVault.connect(user).deposit(AMOUNT);
    });

    it('should be able to restake', async function(){
      await arNXMVault.connect(owner).restake();
    });
  });
});