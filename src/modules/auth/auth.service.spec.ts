import * as bcrypt from 'bcrypt';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: { findOne: jest.Mock };

  beforeEach(async () => {
    usersService = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: usersService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should authenticate when the provided password matches the hashed password', async () => {
    const password = 'Admin@123456';
    const hashedPassword = await bcrypt.hash(password, 10);

    usersService.findOne.mockResolvedValue({
      id: 1,
      email: 'admin@example.com',
      password: hashedPassword,
      fullName: 'System Administrator',
    });

    await expect(
      service.signIn('admin@example.com', password),
    ).resolves.toMatchObject({
      id: 1,
      email: 'admin@example.com',
      fullName: 'System Administrator',
    });
  });

  it('should reject when the password is incorrect', async () => {
    usersService.findOne.mockResolvedValue({
      id: 1,
      email: 'admin@example.com',
      password: await bcrypt.hash('Admin@123456', 10),
    });

    await expect(
      service.signIn('admin@example.com', 'WrongPassword123!'),
    ).rejects.toThrow();
  });
});
