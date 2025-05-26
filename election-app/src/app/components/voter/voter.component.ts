import { Component, OnInit } from '@angular/core';
import { BlockchainService } from '../../services/blockchain.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-voter',
  templateUrl: './voter.component.html',
  imports: [CommonModule, FormsModule, RouterModule],
  standalone: true
})
export class VoterComponent implements OnInit {
  candidates: any[] = [];
  voterDetails: any = null;
  registrationForm = {
    name: '',
    phone: ''
  };
  delegateAddress: string = '';
  isAdmin: boolean = false;

  constructor(private blockchainService: BlockchainService) {}

  async ngOnInit() { 
    await this.blockchainService.init();
    this.blockchainService.isAdmin$.subscribe((isAdmin) => {
      this.isAdmin = isAdmin;
    });
    await this.loadCandidates();
    await this.loadVoterDetails();
    console.log('isAdmin:', this.isAdmin);
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

  async loadVoterDetails() {
    try {
      console.log('Loading voter details');
      const account = this.blockchainService.account;
      console.log(account);
      this.voterDetails = await this.blockchainService.getVoterDetails(account);
      console.log('Voter details loaded:', this.voterDetails);
    } catch (error) {
      console.error('Error loading voter details', error);
    }
  }

  async registerVoter() {
    try {
      await this.blockchainService.registerVoter(
        this.registrationForm.name,
        this.registrationForm.phone
      );
      await this.loadVoterDetails();
    } catch (error) {
      console.error('Error registering voter', error);
    }
  }

  async castVote(candidateId: number) {
    try {
      await this.blockchainService.castVote(candidateId);
      await this.loadVoterDetails();
    } catch (error) {
      console.error('Error casting vote', error);
    }
  }

  async delegateVote() {
    try {
      await this.blockchainService.delegateVote(this.delegateAddress);
      await this.loadVoterDetails();
    } catch (error) {
      console.error('Error delegating vote', error);
    }
  }
}