// src/offers/offers.controller.ts
import { Controller, Get, Post, Patch, Body, UseGuards, Request, Param } from '@nestjs/common';
import { OffersService } from './offers.service';
import { CreateOfferDto } from './dto/create-offer.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('offers')
export class OffersController {
  constructor(private readonly offersService: OffersService) {}

  // 1. Browsing: Get all active marketplace offers
  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll() {
    return await this.offersService.findActiveOffers();
  }

  // 2. Dashboard: Get current logged-in user's offers 
  @Get('my')
  @UseGuards(JwtAuthGuard)
  async findMyOffers(@Request() req: any) {
    return await this.offersService.findUserOffers(req.user.id);
  }

  // 3. Fetching: Get a single offer by ID
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string) {
    return await this.offersService.findOne(id);
  }

  // 4. Creation: List a new offer
  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Request() req: any, @Body() createOfferDto: CreateOfferDto) {
    return await this.offersService.createOffer(req.user.id, createOfferDto);
  }

  // 5. Cancellation: Cancel a user's own active offer (Task 4)
  @Patch(':id/cancel')
  @UseGuards(JwtAuthGuard)
  async cancel(@Param('id') id: string, @Request() req: any) {
    return await this.offersService.cancelOffer(id, req.user.id);
  }
}