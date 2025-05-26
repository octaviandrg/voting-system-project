import { Component, OnInit } from '@angular/core'; 
import { BlockchainService } from '../../services/blockchain.service'; 
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';

@Component({   
  selector: 'app-home',   
  templateUrl: './home.component.html',   
  standalone: true,
  imports: [CommonModule, RouterModule, HttpClientModule],
  styleUrls: ['./home.component.css'] 
}) 
export class HomeComponent implements OnInit {   
  title = 'Election Blockchain App';   
  electionDetails: any = null;   
  electionStarted = false;
  isAdmin = false;
  candidates: any[] = [];
  winner: any = null;
    
  constructor(private blockchainService: BlockchainService) {}    

  async ngOnInit() {     
    try {       
      await this.blockchainService.init();  
      this.blockchainService.isAdmin$.subscribe((isAdmin) => {
        this.isAdmin = isAdmin;
      });     
      await this.loadElectionDetails();
      await this.loadCandidates();
      console.log('isAdmin:', this.isAdmin);
    } catch (error) {       
      console.error('Error initializing BlockchainService', error);     
    }   
  }    


  async loadElectionDetails() {     
    try {       
      const details = await this.blockchainService.getElectionDetails();       
      this.electionDetails = {         
        adminName: details[0],         
        adminEmail: details[1],         
        adminTitle: details[2],         
        electionTitle: details[3],         
        organizationTitle: details[4],       
      };        
      this.electionStarted = await this.blockchainService.getElectionState();     
    } catch (error) {       
      console.error('Error loading election details', error);     
    }   
  }    

  async loadCandidates() {
    try {
      const totalCandidates = await this.blockchainService.getTotalCandidates();
      this.candidates = [];
      for (let i = 0; i < totalCandidates; i++) {
        const candidate = await this.blockchainService.getCandidate(i);
        this.candidates.push(candidate);
      }
    } catch (error) {
      console.error('Error loading candidates', error);
    }
  }


  async getWinner() {
    try {
      this.winner = await this.blockchainService.getWinner();
    } catch (error) {
      console.error('Error getting winner:', error);
    }
  }

  get electionStatus(): string {     
    return this.electionStarted ? 'Ongoing' : 'Not started';   
  } 
}