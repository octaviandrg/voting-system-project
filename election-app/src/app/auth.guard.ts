import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { BlockchainService } from './services/blockchain.service';

export const AuthGuard: CanActivateFn = (route, state) => {
  const blockchainService = inject(BlockchainService);
  const router = inject(Router);

  // Check admin status
  const isAdmin = blockchainService.getIsAdmin(); // Assuming getIsAdmin returns a boolean

  if (!isAdmin) {
    console.log('Access denied. Admin only.');
    router.navigate(['/']); // Redirect to home if not admin
    return false;
  }

  return true; // Allow navigation for admins
};
