import { Injectable } from '@angular/core';
import Web3 from 'web3';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';
import { Router } from '@angular/router';
import electionArtifact from '../../../../smartcontract/build/contracts/Election.json';

@Injectable({
  providedIn: 'root'
})
export class BlockchainService {
  private web3!: Web3;
  private contract: any;
  private contractAddress = '0x9eC1578b29f8e7e26AE74667bFccD85322161d3B';
  private contractABI = (electionArtifact as any).abi; // Load ABI from the JSON file
  public account!: string;
  private initialized = false; // Add an initialization flag

   // Add subjects for account and contract changes
   private accountSubject = new BehaviorSubject<string>('');
   public account$ = this.accountSubject.asObservable();
   
   private adminSubject = new BehaviorSubject<boolean>(false);
   public isAdmin$ = this.adminSubject.asObservable();
 
   constructor(
     private http: HttpClient,
     private router: Router
   ) {
     this.setupAccountListener();
   }

   private setupAccountListener() {
    if (typeof (window as any).ethereum !== 'undefined') {
      (window as any).ethereum.on('accountsChanged', async (accounts: string[]) => {
        console.log('Accounts changed:', accounts); // Log all accounts
  
        if (accounts.length > 0) {
          location.reload();
          this.account = accounts[0];
          console.log('Current account set to:', this.account); // Log the current account
          this.accountSubject.next(this.account);
  
          console.log('Checking admin status for account:', this.account); // Log admin check initiation
          await this.checkAdminStatus();
        } else {
          console.log('No accounts found. Resetting account and admin status.'); // Log when no accounts are available
          this.account = '';
          this.accountSubject.next('');
          this.adminSubject.next(false);
        }
      });
    } else {
      console.warn('Ethereum provider not found. Account listener will not be set up.'); // Log if MetaMask is not detected
    }
  }

  getIsAdmin(): boolean {
    return this.adminSubject.getValue(); // Assuming you're using BehaviorSubject for admin status
  }
  
  async getCurrentAccount(): Promise<string> {
    try {
        const accounts = await this.web3.eth.getAccounts();
        if (accounts.length === 0) {
            throw new Error("No accounts found. Please connect MetaMask.");
        }
        return accounts[0];
    } catch (error) {
        console.error("Error fetching accounts:", error);
        throw error;
    }
}

  async init() {
    if (this.initialized) return;
    
    if (typeof (window as any).ethereum === 'undefined') {
      throw new Error('MetaMask not detected. Please install MetaMask.');
    }

    try {
      this.web3 = new Web3((window as any).ethereum);
      await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
      const accounts = await this.web3.eth.getAccounts();
      this.account = accounts[0];
      this.accountSubject.next(this.account);

      this.contract = new this.web3.eth.Contract(this.contractABI, this.contractAddress);
      this.initialized = true;
      
      await this.checkAdminStatus();
    } catch (error) {
      console.error('Error initializing BlockchainService:', error);
      throw error;
    }
  }

  private async checkAdminStatus() {
    try {
      console.log('Checking admin status...');
  
      const hardcodedAdminAddress = '0x6432EaC5c15079216fFd0Cdd8be12902C44a8E00';
  
      const details = await this.contract.methods.getElectionDetails().call();
  
      const isAdminFromContract = this.account.toLowerCase() === details[0].toLowerCase();
      const isAdminFromHardcoded = this.account.toLowerCase() === hardcodedAdminAddress.toLowerCase();
      const isAdmin = isAdminFromContract || isAdminFromHardcoded;
  
  
      this.adminSubject.next(isAdmin);
  
      if (!isAdmin && window.location.href.includes('/admin')) {
        console.log('Redirecting non-admin user to home page...');
        this.router.navigate(['/']);
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      this.adminSubject.next(false);
    }
  }

  private async ensureInitialized() {
    if (!this.initialized) {
      await this.init();
    }
  }

  private async callContract(method: () => Promise<any>) {
    await this.ensureInitialized();
    if (!this.contract) throw new Error('Contract not initialized.');
    
    try {
      return await method();
    } catch (error: any) {
      if (error.message.includes('User denied transaction')) {
        throw new Error('Transaction rejected by user');
      }
      throw error;
    }
  }


  async getAllVoters() {
    return this.callContract(async () => {
        const result = await this.contract.methods.getVoterList().call({
          from: await this.getCurrentAccount(), 
          gas: 3000000
        });
        // Access the data using the numeric keys instead of destructuring
        const addresses = result[0];
        const names = result[1];
        const phones = result[2];
        const isVerifiedStatuses = result[3];

        // Safely map the data
        return addresses.map((address: string, index: number) => ({
            address,
            name: names[index],
            phone: phones[index],
            isVerified: isVerifiedStatuses[index],
        }));
    });
}

  async getElectionDetails(): Promise<any> {
    await this.ensureInitialized(); 
    if (!this.contract) throw new Error('Contract not initialized.');
    return await this.contract.methods.getElectionDetails().call();
  }

  async getElectionState(): Promise<boolean> {
    await this.ensureInitialized(); 
    if (!this.contract) throw new Error('Contract not initialized.');
    return await this.contract.methods.start().call();
  }

  async startElection(): Promise<void> {
    await this.ensureInitialized(); 
    if (!this.contract) throw new Error('Contract not initialized.');
    const accounts = await this.web3.eth.getAccounts();
    await this.contract.methods.startElection().send({ from: accounts[0] });
  }

  async endElection(): Promise<void> {
    await this.ensureInitialized(); 
    if (!this.contract) throw new Error('Contract not initialized.');
    const accounts = await this.web3.eth.getAccounts();
    await this.contract.methods.endElection().send({ from: accounts[0] });
  }

  async addCandidate(header: string, slogan: string) {
    await this.ensureInitialized();
    if (!this.contract) throw new Error('Contract not initialized.');

    try {
        const accounts = await this.web3.eth.getAccounts();
        console.log('Fetched accounts:', accounts); // Log the accounts to ensure they are fetched correctly

        if (!accounts || accounts.length === 0) {
            console.error('No accounts found. Ensure MetaMask is connected and the correct network is selected.');
            throw new Error('No accounts available. Please connect your wallet.');
        }

        console.log(`Attempting to add candidate with header: ${header}, slogan: ${slogan}, from account: ${accounts[0]}`);
        return await this.contract.methods.addCandidate(header, slogan).send({ from: accounts[0] });
    } catch (error) {
        console.error('Error in addCandidate:', error); // Log any errors
        throw error; // Rethrow the error to propagate it to the caller
    }
}

  async registerVoter(name: string, phone: string) {
    await this.ensureInitialized(); 
    if (!this.contract) throw new Error('Contract not initialized.');
    const accounts = await this.web3.eth.getAccounts();
    return await this.contract.methods.registerAsVoter(name, phone).send({ from: accounts[0] });
  }

  async verifyVoter(voterAddress: string, status: boolean) {
    await this.ensureInitialized(); 
    if (!this.contract) throw new Error('Contract not initialized.');
    const accounts = await this.web3.eth.getAccounts();
    return await this.contract.methods.verifyVoter(voterAddress, status).send({ from: accounts[0] });
  }

  async castVote(candidateId: number) {
    await this.ensureInitialized(); 
    if (!this.contract) throw new Error('Contract not initialized.');
    const accounts = await this.web3.eth.getAccounts();
    return await this.contract.methods.vote(candidateId).send({ from: accounts[0] });
  }

  async getWinner() {
    await this.ensureInitialized(); 
    if (!this.contract) throw new Error('Contract not initialized.');
    const accounts = await this.web3.eth.getAccounts();
    return await this.contract.methods.getWinner().call();
  }

  async getTotalCandidates() {
    await this.ensureInitialized(); 
    if (!this.contract) throw new Error('Contract not initialized.');
    const accounts = await this.web3.eth.getAccounts();
    return await this.contract.methods.getTotalCandidates().call();
  }

  async getCandidate(id: number) {
    await this.ensureInitialized(); 
    if (!this.contract) throw new Error('Contract not initialized.');
    const accounts = await this.web3.eth.getAccounts();
    return await this.contract.methods.candidateDetails(id).call();
  }

  async getVoterDetails(address: string) {
    await this.ensureInitialized(); 
    if (!this.contract) throw new Error('Contract not initialized.');
    const accounts = await this.web3.eth.getAccounts();
    return await this.contract.methods.voterDetails(address).call();
  }

  async removeVoter(address: string) {
    await this.ensureInitialized(); 
    if (!this.contract) throw new Error('Contract not initialized.');
    const accounts = await this.web3.eth.getAccounts();
    return await this.contract.methods.removeVoter(address).send({ from: accounts[0]});
  }

  async delegateVote(to: string) {
    await this.ensureInitialized(); 
    if (!this.contract) throw new Error('Contract not initialized.');
    const accounts = await this.web3.eth.getAccounts();
    return await this.contract.methods.delegate(to).send({ from: accounts[0] });
  }
}
