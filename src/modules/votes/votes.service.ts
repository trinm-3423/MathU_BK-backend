import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateVoteDto } from './dto/create-vote.dto';
import { UpdateVoteDto } from './dto/update-vote.dto';
import { PrismaService } from 'nestjs-prisma';
import { UsersService } from '../users/users.service';
import { QuestionsService } from '../questions/questions.service';
import { AnswersService } from '../answers/answers.service';
import { DynamicMessage } from 'src/constants';
import { Vote } from './entities/vote.entity';
import { VoteableTypes } from '@prisma/client';
import { User } from '../users/entities/user.entity';
import { CaslAbilityFactory } from 'src/casl/casl-ability.factory/casl-ability.factory';
import { Action } from 'src/constants/enum';

@Injectable()
export class VotesService {
  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
    private questionsService: QuestionsService,
    private answersService: AnswersService,
    private caslAbility: CaslAbilityFactory,
  ) {}

  async create(createVoteDto: CreateVoteDto): Promise<Vote> {
    const userExist = await this.usersService.findOne(createVoteDto.user_id);

    if (userExist) {
      const service = await this.getServiceByTypes(createVoteDto.voteable_type);

      const likedItem = await service.findOne(createVoteDto.voteable_id);

      if (likedItem)
        return await this.prisma.votes.create({ data: createVoteDto });
    }
  }

  async findAll(): Promise<Vote[]> {
    return await this.prisma.votes.findMany({
      orderBy: [
        {
          created_at: 'desc',
        },
      ],
    });
  }

  async findOne(id: number): Promise<Vote> {
    return await this.prisma.votes.findUniqueOrThrow({
      where: { id },
    });
  }

  async update(
    id: number,
    updateVoteDto: UpdateVoteDto,
    currentUser: User,
  ): Promise<Vote> {
    const voteToUpdate = await this.findOne(id);
    await this.caslAbility.isSubjectForbidden(
      currentUser,
      Action.Update,
      Vote,
      voteToUpdate,
    );

    return await this.prisma.votes.update({
      where: { id },
      data: updateVoteDto,
    });
  }

  async remove(id: number, currentUser: User): Promise<Vote> {
    const voteToDelete = await this.findOne(id);
    await this.caslAbility.isSubjectForbidden(
      currentUser,
      Action.Delete,
      Vote,
      voteToDelete,
    );

    return await this.prisma.votes.delete({ where: { id } });
  }

  async getServiceByTypes(type: string) {
    const servicesMap = {
      [VoteableTypes.QUESTION]: this.questionsService,
      [VoteableTypes.ANSWER]: this.answersService,
    };

    if (!servicesMap[type])
      throw new NotFoundException(DynamicMessage.notFound('Type'));

    return servicesMap[type];
  }
}
