import { Component, OnInit } from '@angular/core';
import { BlockchainService } from '../../services/blockchain.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  imports: [CommonModule, FormsModule, RouterModule],
  standalone: true
})
export class AdminComponent implements OnInit {
  candidates: any[] = [];
  voters: any[] = [];
  newCandidate = {
    header: '',
    slogan: ''
  };
  voterAddress: string = '';
  winner: any = null;
  electionStarted = false;
  errorMessage: string | null = null; // Variable to hold error messages


  constructor(private blockchainService: BlockchainService) {}

  async ngOnInit() {  
    await this.blockchainService.init();
    await this.loadCandidates();
    await this.loadVoters();
    await this.checkElectionStatus();
  }

  async loadVoters() {
    try {
      this.voters = await this.blockchainService.getAllVoters();
      console.log('Voters loaded:', this.voters);
    } catch (error) {
      if (error instanceof Error) {
        console.error('Error loading voters:', error.message);
      } else {
        console.error('Unknown error:', error);
      }
      this.errorMessage = 'Failed to load voters. Please check console for details.';
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

  async addCandidate() {
    try {
      await this.blockchainService.addCandidate(
        this.newCandidate.header,
        this.newCandidate.slogan
      );
      this.newCandidate.header = '';
      this.newCandidate.slogan = '';
      await this.loadCandidates();
    } catch (error) {
      console.error('Error adding candidate', error);
    }
  }

  async verifyVoter(address: string, status: boolean) {
    try {
      await this.blockchainService.verifyVoter(address, status);
      console.log('Voter verification updated');
    } catch (error) {
      console.error('Error verifying voter', error);
    }
  }

  async removeVoter(address: string) {
    try {
      await this.blockchainService.removeVoter(address);
      console.log('Voter removed');
    } catch (error) {
      console.error('Error removing voter', error);
    }
  }

  async getWinner() {
    try {
      this.winner = await this.blockchainService.getWinner();
    } catch (error) {
      if (error instanceof Error) {
        console.error('Error loading winner:', error.message);
      } else {
        console.error('Unknown error:', error);
      }
      this.errorMessage = 'Failed to load winner. Election is still in progress.';
    }
  }

  async checkElectionStatus() {
    try {
      this.electionStarted = await this.blockchainService.getElectionState();
    } catch (error) {
      console.error('Error checking election status', error);
    }
  }

  async startElection() {
    try {
      await this.blockchainService.startElection();
      this.electionStarted = true;
      console.log('Election started');
    } catch (error) {
      console.error('Error starting election', error);
    }
  }

  async endElection() {
    try {
      await this.blockchainService.endElection();
      this.electionStarted = false;
      await this.getWinner();
      console.log('Election ended');
    } catch (error) {
      console.error('Error ending election', error);
    }
  }
}
